import { db } from '../db/index.js'
import { instances } from '../db/schema/instances.js'
import { nodes } from '../db/schema/nodes.js'
import { plans } from '../db/schema/plans.js'
import { eq, and, sql } from 'drizzle-orm'
import { findEligibleNode } from './allocation.service.js'
import { generateInvoice } from './billing.service.js'
import type { NewInstance } from '../db/schema/instances.js'

export async function listInstances(userId: string, isAdmin: boolean) {
  if (isAdmin) return db.select().from(instances)
  return db.select().from(instances).where(eq(instances.userId, userId))
}

export async function getInstance(id: string, userId: string, isAdmin: boolean) {
  const result = await db.select().from(instances).where(
    isAdmin
      ? eq(instances.id, id)
      : and(eq(instances.id, id), eq(instances.userId, userId))
  )
  return result[0] ?? null
}

export async function createInstance(data: {
  userId: string
  planId: string
  name: string
  osImage: NewInstance['osImage']
}) {
  return db.transaction(async (tx) => {
    // 1. Ambil plan
    const planResult = await tx.select().from(plans).where(eq(plans.id, data.planId))
    const plan = planResult[0]
    if (!plan) throw new Error('Plan not found')
    if (!plan.isActive) throw new Error('Plan is not active')

    // 2. Cari node eligible via best-fit
    const node = await findEligibleNode(plan)
    if (!node) throw new Error('No eligible node available')

    // 3. Buat instance
    const instanceResult = await tx
      .insert(instances)
      .values({
        userId: data.userId,
        nodeId: node.id,
        planId: plan.id,
        name: data.name,
        osImage: data.osImage,
        status: 'provisioning',
      })
      .returning()

    const instance = instanceResult[0]

    // 4. Update resource usage di node (atomik)
    await tx
      .update(nodes)
      .set({
        usedRamGb:     sql`${nodes.usedRamGb} + ${plan.ramGb}`,
        usedCpuCores:  sql`${nodes.usedCpuCores} + ${plan.cpuCores}`,
        usedStorageGb: sql`${nodes.usedStorageGb} + ${plan.storageGb}`,
        updatedAt:     new Date(),
      })
      .where(eq(nodes.id, node.id))

    // 5. Generate invoice otomatis (dalam transaksi yang sama)
    await generateInvoice(tx, {
      userId: data.userId,
      instanceId: instance.id,
      planId: plan.id,
      amount: plan.priceMonthly,  // numeric string dari schema
      instanceName: data.name,
    })

    // 6. Set status jadi running
    const finalResult = await tx
      .update(instances)
      .set({ status: 'running' })
      .where(eq(instances.id, instance.id))
      .returning()

    return finalResult[0]
  })
}

export async function terminateInstance(id: string, userId: string, isAdmin: boolean) {
  return db.transaction(async (tx) => {
    // 1. Ambil instance
    const instanceResult = await tx.select().from(instances).where(
      isAdmin
        ? eq(instances.id, id)
        : and(eq(instances.id, id), eq(instances.userId, userId))
    )
    const instance = instanceResult[0]
    if (!instance) throw new Error('Instance not found')
    if (instance.status === 'terminated') throw new Error('Instance already terminated')

    // 2. Ambil plan untuk tahu resource yang perlu dilepas
    const planResult = await tx.select().from(plans).where(eq(plans.id, instance.planId))
    const plan = planResult[0]

    // 3. Lepas resource di node
    if (plan) {
      await tx
        .update(nodes)
        .set({
          usedRamGb:     sql`${nodes.usedRamGb} - ${plan.ramGb}`,
          usedCpuCores:  sql`${nodes.usedCpuCores} - ${plan.cpuCores}`,
          usedStorageGb: sql`${nodes.usedStorageGb} - ${plan.storageGb}`,
          updatedAt:     new Date(),
        })
        .where(eq(nodes.id, instance.nodeId))
    }

    // 4. Update status instance
    const finalResult = await tx
      .update(instances)
      .set({ status: 'terminated', terminatedAt: new Date() })
      .where(eq(instances.id, id))
      .returning()

    return finalResult[0]
  })
}

export async function stopInstance(id: string, userId: string, isAdmin: boolean) {
  const result = await db
    .update(instances)
    .set({ status: 'stopped' })
    .where(
      isAdmin
        ? eq(instances.id, id)
        : and(eq(instances.id, id), eq(instances.userId, userId))
    )
    .returning()
  return result[0] ?? null
}

export async function startInstance(id: string, userId: string, isAdmin: boolean) {
  const result = await db
    .update(instances)
    .set({ status: 'running' })
    .where(
      isAdmin
        ? eq(instances.id, id)
        : and(eq(instances.id, id), eq(instances.userId, userId))
    )
    .returning()
  return result[0] ?? null
}