import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { instances } from '../schema/instances.js'
import { z } from 'zod'

export const insertInstanceSchema = createInsertSchema(instances, {
  name: z.string().min(3).max(50),
  sshPort: z.number().int().min(1).max(65535).optional(),
}).omit({ id: true, status: true, ipAddress: true, createdAt: true, expiresAt: true, terminatedAt: true })

export const updateInstanceSchema = insertInstanceSchema.partial()
export const selectInstanceSchema = createSelectSchema(instances)