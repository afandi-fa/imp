import { pgTable, text, integer, pgEnum, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { nodes } from './nodes.js'
import { plans } from './plans'

export const instanceStatusEnum = pgEnum('instance_status', [
  'pending', 'provisioning', 'running', 'stopped', 'terminated', 'error'
])
export const osImageEnum = pgEnum('os_image', [
  'ubuntu-22.04', 'ubuntu-24.04', 'debian-12', 'alpine-3.19'
])

export const instances = pgTable('instances', {
  id:           text('id').primaryKey().$defaultFn(() => createId()),
  userId:       text('user_id').notNull(),
  nodeId:       text('node_id').notNull().references(() => nodes.id),
  planId:       text('plan_id').notNull().references(() => plans.id),
  name:         text('name').notNull(),
  status:       instanceStatusEnum('status').notNull().default('pending'),
  osImage:      osImageEnum('os_image').notNull(),
  ipAddress:    text('ip_address'),
  sshPort:      integer('ssh_port'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  expiresAt:    timestamp('expires_at'),
  terminatedAt: timestamp('terminated_at'),
})

export type Instance       = typeof instances.$inferSelect
export type NewInstance    = typeof instances.$inferInsert
export type InstanceStatus = (typeof instanceStatusEnum.enumValues)[number]