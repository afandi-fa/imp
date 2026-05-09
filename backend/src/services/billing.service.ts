// backend/src/services/billing.service.ts

import { db } from '../db/index.js'
import { invoices } from '../db/schema/billing.js'
import { instances } from '../db/schema/instances.js'
import { plans } from '../db/schema/plans.js'
import { eq, and, lt, inArray, ne } from 'drizzle-orm'
import type { NewInvoice } from '../db/schema/billing.js'

// ─── Xendit Client ────────────────────────────────────────────────────────────

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY ?? ''
const XENDIT_API_URL = 'https://api.xendit.co'

async function xenditRequest<T>(
  path: string,
  method: 'GET' | 'POST',
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${XENDIT_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${XENDIT_SECRET_KEY}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (!res.ok) {
    const err = (await res.json()) as { message?: string }
    throw new Error(`Xendit error: ${err.message ?? res.statusText}`)
  }

  return res.json() as Promise<T>
}

type XenditInvoice = {
  id: string
  invoice_url: string
  status: string
}

// ─── Generate Invoice ─────────────────────────────────────────────────────────

export async function generateInvoice(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  data: {
    userId: string
    instanceId: string
    planId: string
    amount: string
    instanceName: string
  },
): Promise<typeof invoices.$inferSelect> {
  const now = new Date()

  const periodEnd = new Date(now)
  periodEnd.setDate(periodEnd.getDate() + 30)

  const newInvoice: NewInvoice = {
    userId: data.userId,
    instanceId: data.instanceId,
    planId: data.planId,
    amount: data.amount,
    periodStart: now,
    periodEnd,
    dueDate: periodEnd,
    status: 'unpaid',
  }

  const result = await tx
    .insert(invoices)
    .values(newInvoice)
    .returning()

  return result[0]
}

// ─── List Invoices ────────────────────────────────────────────────────────────

export async function listInvoices(userId: string, isAdmin: boolean) {
  // lazy check overdue
  await checkAndSuspendOverdue(userId, isAdmin)

  if (isAdmin) {
    return db
      .select()
      .from(invoices)
      .orderBy(invoices.createdAt)
  }

  return db
    .select()
    .from(invoices)
    .where(eq(invoices.userId, userId))
    .orderBy(invoices.createdAt)
}

// ─── Get Invoice ──────────────────────────────────────────────────────────────

export async function getInvoice(
  id: string,
  userId: string,
  isAdmin: boolean,
) {
  const result = await db
    .select()
    .from(invoices)
    .where(
      isAdmin
        ? eq(invoices.id, id)
        : and(
            eq(invoices.id, id),
            eq(invoices.userId, userId),
          ),
    )

  return result[0] ?? null
}

// ─── Pay Invoice via Xendit ───────────────────────────────────────────────────

export async function payInvoice(
  invoiceId: string,
  userId: string,
  paymentMethod: string,
  isAdmin: boolean,
): Promise<typeof invoices.$inferSelect> {
  const invoice = await getInvoice(invoiceId, userId, isAdmin)

  if (!invoice) {
    throw new Error('Invoice not found')
  }

  if (invoice.status === 'paid') {
    throw new Error('Invoice already paid')
  }

  const instanceResult = await db
    .select({ name: instances.name })
    .from(instances)
    .where(eq(instances.id, invoice.instanceId))

  const instanceName =
    instanceResult[0]?.name ?? invoice.instanceId

  const xenditInvoice = await xenditRequest<XenditInvoice>(
    '/v2/invoices',
    'POST',
    {
      external_id: invoice.id,
      amount: Number(invoice.amount),
      payer_email: `user-${userId}@imp.local`,
      description: `Invoice IMP — ${instanceName} (${invoice.periodStart.toLocaleDateString(
        'id-ID',
      )} - ${invoice.periodEnd.toLocaleDateString('id-ID')})`,
      payment_methods: [paymentMethod],
      invoice_duration: 86400,
      currency: 'IDR',
    },
  )

  const updated = await db
    .update(invoices)
    .set({
      xenditInvoiceId: xenditInvoice.id,
      xenditPaymentUrl: xenditInvoice.invoice_url,
      xenditPaymentMethod: paymentMethod,
    })
    .where(eq(invoices.id, invoiceId))
    .returning()

  return updated[0]
}

// ─── Webhook: Xendit payment callback ────────────────────────────────────────

export async function handleXenditWebhook(payload: {
  external_id: string
  status: string
  payment_method?: string
}): Promise<void> {
  if (payload.status !== 'PAID') return

  const invoice = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, payload.external_id))

  const inv = invoice[0]

  if (!inv || inv.status === 'paid') {
    return
  }

  await db.transaction(async (tx) => {
    // mark paid
    await tx
      .update(invoices)
      .set({
        status: 'paid',
        paidAt: new Date(),
        xenditPaymentMethod:
          payload.payment_method ??
          inv.xenditPaymentMethod,
      })
      .where(eq(invoices.id, inv.id))

    // re-activate instance jika sebelumnya suspended
    await tx
      .update(instances)
      .set({ status: 'running' })
      .where(
        and(
          eq(instances.id, inv.instanceId),
          eq(instances.status, 'stopped'),
        ),
      )
  })
}

// ─── Auto-suspend overdue invoices ────────────────────────────────────────────
// Bisa dipanggil:
// - global via cron
// - per-user via lazy evaluation

export async function checkAndSuspendOverdue(
  userId?: string,
  isAdmin = true,
): Promise<void> {
  const threeDaysAgo = new Date()

  threeDaysAgo.setDate(
    threeDaysAgo.getDate() - 3,
  )

  const overdueInvoices = await db
    .select()
    .from(invoices)
    .where(
      and(
        !isAdmin && userId
          ? eq(invoices.userId, userId)
          : undefined,

        inArray(invoices.status, [
          'unpaid',
          'overdue',
        ]),

        lt(invoices.dueDate, threeDaysAgo),
      ),
    )

  if (overdueInvoices.length === 0) {
    return
  }

  await db.transaction(async (tx) => {
    for (const inv of overdueInvoices) {
      // suspend instance
      await tx
        .update(instances)
        .set({ status: 'stopped' })
        .where(
          and(
            eq(instances.id, inv.instanceId),
            ne(instances.status, 'terminated'),
          ),
        )

      // mark invoice suspended
      await tx
        .update(invoices)
        .set({
          status: 'suspended',
          suspendedAt: new Date(),
        })
        .where(eq(invoices.id, inv.id))
    }
  })
}

// ─── Mark invoices as overdue ────────────────────────────────────────────────

export async function markOverdueInvoices(): Promise<void> {
  const now = new Date()

  await db
    .update(invoices)
    .set({ status: 'overdue' })
    .where(
      and(
        eq(invoices.status, 'unpaid'),
        lt(invoices.dueDate, now),
      ),
    )
}