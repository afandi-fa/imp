import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

export const activityLogs = pgTable('activity_logs', {
  id:         text('id').primaryKey().$defaultFn(() => createId()),
  userId:     text('user_id').notNull(),
  action:     text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId:   text('target_id'),
  metadata:   jsonb('metadata'),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
})

export type ActivityLog    = typeof activityLogs.$inferSelect
export type NewActivityLog = typeof activityLogs.$inferInsert