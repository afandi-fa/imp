import { db } from '../db/index.js'
import { nodes } from '../db/schema/nodes.js'
import { eq, and, gte, sql } from 'drizzle-orm'
import type { Node } from '../db/schema/nodes.js'
import type { Plan } from '../db/schema/plans.js'

/**
 * Best-fit algorithm: cari node dengan sisa RAM paling sedikit
 * tapi masih cukup untuk menampung plan yang diminta.
 */
export async function findEligibleNode(plan: Plan): Promise<Node | null> {
  const availableNodes = await db
    .select()
    .from(nodes)
    .where(
      and(
        eq(nodes.status, 'online'),
        gte(sql`${nodes.totalRamGb} - ${nodes.usedRamGb}`, plan.ramGb),
        gte(sql`${nodes.totalCpuCores} - ${nodes.usedCpuCores}`, plan.cpuCores),
        gte(sql`${nodes.totalStorageGb} - ${nodes.usedStorageGb}`, plan.storageGb),
      )
    )

  if (availableNodes.length === 0) return null

  // Best-fit: node dengan sisa RAM paling sedikit setelah alokasi
  return availableNodes.reduce((best, node) => {
    const remainingAfter = (node.totalRamGb - node.usedRamGb) - plan.ramGb
    const bestRemainingAfter = (best.totalRamGb - best.usedRamGb) - plan.ramGb
    return remainingAfter < bestRemainingAfter ? node : best
  })
}