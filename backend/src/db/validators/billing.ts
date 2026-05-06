import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { invoices } from '../schema/billing.js'
import { z } from 'zod'

export const insertInvoiceSchema = createInsertSchema(invoices, {
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  dueDate: z.string().date(),
}).omit({ id: true, status: true, paidAt: true, createdAt: true })

export const updateInvoiceSchema = insertInvoiceSchema.partial()
export const selectInvoiceSchema = createSelectSchema(invoices)