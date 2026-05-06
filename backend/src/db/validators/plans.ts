import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { plans } from '../schema/plans.js'
import { z } from 'zod'

export const insertPlanSchema = createInsertSchema(plans, {
  ramGb:        z.number().int().min(1),
  cpuCores:     z.number().int().min(1),
  storageGb:    z.number().int().min(1),
  bandwidthGb:  z.number().int().min(1),
  priceMonthly: z.string().regex(/^\d+(\.\d{1,2})?$/),
}).omit({ id: true, createdAt: true })

export const updatePlanSchema = insertPlanSchema.partial()
export const selectPlanSchema = createSelectSchema(plans)