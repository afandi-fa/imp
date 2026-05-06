import { pgTable, text, integer, boolean, numeric, pgEnum, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

export const planTypeEnum = pgEnum('plan_type', ['vps', 'lxc', 'k8s_node', 'dedicated'])

export const plans = pgTable('plans', {
  id:           text('id').primaryKey().$defaultFn(() => createId()),
  name:         text('name').notNull(),
  type:         planTypeEnum('type').notNull(),
  ramGb:        integer('ram_gb').notNull(),
  cpuCores:     integer('cpu_cores').notNull(),
  storageGb:    integer('storage_gb').notNull(),
  bandwidthGb:  integer('bandwidth_gb').notNull(),
  priceMonthly: numeric('price_monthly', { precision: 10, scale: 2 }).notNull(),
  stockLimit:   integer('stock_limit'),
  isActive:     boolean('is_active').notNull().default(true),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
})

export type Plan     = typeof plans.$inferSelect
export type NewPlan  = typeof plans.$inferInsert
export type PlanType = (typeof planTypeEnum.enumValues)[number]