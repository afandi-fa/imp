import { pgTable, text, numeric, pgEnum, timestamp, date } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { instances } from './instances'

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'unpaid', 'paid', 'overdue', 'cancelled'
])

export const invoices = pgTable('invoices', {
  id:         text('id').primaryKey().$defaultFn(() => createId()),
  userId:     text('user_id').notNull(),
  instanceId: text('instance_id').references(() => instances.id),
  amount:     numeric('amount', { precision: 10, scale: 2 }).notNull(),
  status:     invoiceStatusEnum('status').notNull().default('unpaid'),
  dueDate:    date('due_date').notNull(),
  paidAt:     timestamp('paid_at'),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
})

export type Invoice       = typeof invoices.$inferSelect
export type NewInvoice    = typeof invoices.$inferInsert
export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number]