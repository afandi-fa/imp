import { db } from '../db/index.js'
import { plans } from '../db/schema/plans.js'
import { eq } from 'drizzle-orm'
import type { NewPlan } from '../db/schema/plans.js'

export async function listPlans() {
  return db.select().from(plans).where(eq(plans.isActive, true))
}

export async function getPlan(id: string) {
  const result = await db.select().from(plans).where(eq(plans.id, id))
  return result[0] ?? null
}

export async function createPlan(data: NewPlan) {
  const result = await db.insert(plans).values(data).returning()
  return result[0]
}

export async function updatePlan(id: string, data: Partial<NewPlan>) {
  const result = await db
    .update(plans)
    .set(data)
    .where(eq(plans.id, id))
    .returning()
  return result[0] ?? null
}

export async function deletePlan(id: string) {
  // soft delete — set isActive false
  const result = await db
    .update(plans)
    .set({ isActive: false })
    .where(eq(plans.id, id))
    .returning()
  return result[0] ?? null
}