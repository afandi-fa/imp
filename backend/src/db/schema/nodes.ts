import { pgTable, text, integer, pgEnum, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

export const nodeStatusEnum = pgEnum('node_status', ['online', 'offline', 'maintenance'])
export const nodeTypeEnum   = pgEnum('node_type',   ['compute', 'storage', 'gpu'])

export const nodes = pgTable('nodes', {
  id:             text('id').primaryKey().$defaultFn(() => createId()),
  name:           text('name').notNull(),
  ipAddress:      text('ip_address').notNull().unique(),
  region:         text('region').notNull(),
  type:           nodeTypeEnum('type').notNull().default('compute'),
  status:         nodeStatusEnum('status').notNull().default('online'),
  totalRamGb:     integer('total_ram_gb').notNull(),
  totalCpuCores:  integer('total_cpu_cores').notNull(),
  totalStorageGb: integer('total_storage_gb').notNull(),
  usedRamGb:      integer('used_ram_gb').notNull().default(0),
  usedCpuCores:   integer('used_cpu_cores').notNull().default(0),
  usedStorageGb:  integer('used_storage_gb').notNull().default(0),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow(),
})

export type Node       = typeof nodes.$inferSelect
export type NewNode    = typeof nodes.$inferInsert
export type NodeStatus = (typeof nodeStatusEnum.enumValues)[number]
export type NodeType   = (typeof nodeTypeEnum.enumValues)[number]