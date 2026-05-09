import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { payInvoiceSchema } from '../db/validators/billing.js'
import * as billingService from '../services/billing.service.js'
import { z } from 'zod'

type HonoVariables = {
  user: { id: string; role?: string }
  session: { id: string; userId: string }
}

const app = new Hono<{ Variables: HonoVariables }>()

const paginationSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ─── GET /api/billing ─────────────────────────────────────────────────────────
// List invoices. User lihat milik sendiri, admin lihat semua.
// Lazy check overdue terjadi di sini.

app.get(
  '/',
  requireAuth,
  zValidator('query', paginationSchema),
  async (c) => {
    const user    = c.get('user')
    const isAdmin = user.role === 'admin' || user.role === 'superAdmin'
    const { page, limit } = c.req.valid('query')

    const all = await billingService.listInvoices(user.id, isAdmin)

    // Pagination manual — listInvoices sudah filter by userId
    const total      = all.length
    const totalPages = Math.ceil(total / limit)
    const data       = all.slice((page - 1) * limit, page * limit)

    return c.json({
      data: { invoices: data, total, page, limit, totalPages },
      error: null,
    })
  },
)

// ─── GET /api/billing/:id ─────────────────────────────────────────────────────

app.get('/:id', requireAuth, async (c) => {
  const user    = c.get('user')
  const isAdmin = user.role === 'admin' || user.role === 'superAdmin'
  const id      = c.req.param('id') ?? ''

  const invoice = await billingService.getInvoice(id, user.id, isAdmin)
  if (!invoice) {
    return c.json(
      { data: null, error: { message: 'Invoice not found', code: 'NOT_FOUND' } },
      404,
    )
  }

  return c.json({ data: invoice, error: null })
})

// ─── POST /api/billing/:id/pay ────────────────────────────────────────────────
// Buat Xendit invoice & return payment URL.

app.post(
  '/:id/pay',
  requireAuth,
  zValidator('json', payInvoiceSchema),
  async (c) => {
    const user          = c.get('user')
    const isAdmin       = user.role === 'admin' || user.role === 'superAdmin'
    const id            = c.req.param('id') ?? ''
    const { paymentMethod } = c.req.valid('json')

    const invoice = await billingService.payInvoice(id, user.id, paymentMethod, isAdmin)

    return c.json({
      data: {
        invoiceId:     invoice.id,
        paymentUrl:    invoice.xenditPaymentUrl,
        paymentMethod: invoice.xenditPaymentMethod,
        amount:        invoice.amount,
      },
      error: null,
    })
  },
)

// ─── POST /api/billing/webhook/xendit ────────────────────────────────────────
// Xendit callback — tandai invoice paid & unsuspend instance.
// Endpoint ini TIDAK pakai requireAuth — diakses Xendit server-to-server.
// Verifikasi via header x-callback-token.

app.post('/webhook/xendit', async (c) => {
  const token    = c.req.header('x-callback-token')
  const expected = process.env.XENDIT_WEBHOOK_TOKEN ?? ''

  if (!expected || token !== expected) {
    return c.json(
      { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
      401,
    )
  }

  const payload = await c.req.json<{
    external_id: string
    status: string
    payment_method?: string
  }>()

  await billingService.handleXenditWebhook(payload)

  return c.json({ data: { received: true }, error: null })
})

// ─── POST /api/billing/check-overdue ─────────────────────────────────────────
// Trigger manual check overdue — admin only.
// Berguna untuk testing atau jika ingin trigger via cron eksternal.

app.post(
  '/check-overdue',
  requireAuth,
  requireRole('admin', 'superAdmin'),
  async (c) => {
    await billingService.markOverdueInvoices()
    await billingService.checkAndSuspendOverdue('', true)
    return c.json({ data: { success: true }, error: null })
  },
)

export default app