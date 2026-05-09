import { pgTable, text, numeric, pgEnum, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { instances } from './instances.js'
import { plans } from './plans.js'

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'unpaid',   // baru dibuat, belum dibayar
  'paid',     // sudah dibayar
  'overdue',  // melewati due date
  'suspended', // instance sudah di-suspend karena overdue > 3 hari
])

export const invoices = pgTable('invoices', {
  id:              text('id').primaryKey().$defaultFn(() => createId()),
  userId:          text('user_id').notNull(),
  instanceId:      text('instance_id').notNull().references(() => instances.id),
  planId:          text('plan_id').notNull().references(() => plans.id),

  // Periode billing
  periodStart:     timestamp('period_start').notNull(),
  periodEnd:       timestamp('period_end').notNull(),   // periodStart + 30 hari

  // Jumlah tagihan — disalin dari plan.priceMonthly saat invoice dibuat
  // agar perubahan harga plan tidak mempengaruhi invoice lama
  amount:          numeric('amount', { precision: 10, scale: 2 }).notNull(),

  status:          invoiceStatusEnum('status').notNull().default('unpaid'),

  // Xendit
  xenditInvoiceId: text('xendit_invoice_id'),           // ID dari Xendit
  xenditPaymentUrl: text('xendit_payment_url'),         // URL checkout Xendit
  xenditPaymentMethod: text('xendit_payment_method'),  // misal: 'BANK_TRANSFER', 'QRIS'

  dueDate:         timestamp('due_date').notNull(),     // periodStart + 30 hari
  paidAt:          timestamp('paid_at'),
  suspendedAt:     timestamp('suspended_at'),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
})

export type Invoice       = typeof invoices.$inferSelect
export type NewInvoice    = typeof invoices.$inferInsert
export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number]