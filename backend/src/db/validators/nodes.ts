import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { nodes } from '../schema/nodes.js'
import { z } from 'zod'

export const insertNodeSchema = createInsertSchema(nodes, {
  ipAddress:      z.string(),
  totalRamGb:     z.number().int().min(1),
  totalCpuCores:  z.number().int().min(1),
  totalStorageGb: z.number().int().min(1),
}).omit({ id: true, usedRamGb: true, usedCpuCores: true, usedStorageGb: true, createdAt: true, updatedAt: true })

export const updateNodeSchema = insertNodeSchema.partial()
export const selectNodeSchema = createSelectSchema(nodes)