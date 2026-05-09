import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { invoices } from '../schema/billing.js'
import { z } from 'zod'

export const insertInvoiceSchema = createInsertSchema(invoices, {
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  dueDate: z.string().date(),
}).omit({ id: true, status: true, paidAt: true, createdAt: true })

export const updateInvoiceSchema = insertInvoiceSchema.partial()
export const selectInvoiceSchema = createSelectSchema(invoices)

export const payInvoiceSchema = z.object({
  paymentMethod: z.enum([
    'BANK_TRANSFER',
    'QRIS',
    'OVO',
    'GOPAY',
    'DANA',
    'CREDIT_CARD',
  ]),
})
 
export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>
 