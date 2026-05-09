import { db } from '../db/index.js'
import { nodes } from '../db/schema/nodes.js'
import { eq } from 'drizzle-orm'
import type { NewNode } from '../db/schema/nodes.js'

export async function listNodes() {
  return db.select().from(nodes)
}

export async function getNode(id: string) {
  const result = await db.select().from(nodes).where(eq(nodes.id, id))
  return result[0] ?? null
}

export async function createNode(data: NewNode) {
  const result = await db.insert(nodes).values(data).returning()
  return result[0]
}

export async function updateNode(id: string, data: Partial<NewNode>) {
  const result = await db
    .update(nodes)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(nodes.id, id))
    .returning()
  return result[0] ?? null
}

export async function deleteNode(id: string) {
  const result = await db
    .delete(nodes)
    .where(eq(nodes.id, id))
    .returning()
  return result[0] ?? null
}