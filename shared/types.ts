// Re-export semua domain types — frontend import dari sini
// Tidak ada interface yang ditulis ulang, semua berasal dari schema

export type { Node, NewNode, NodeStatus, NodeType }       from '../backend/src/db/schema/nodes.js'
export type { Plan, NewPlan, PlanType }                   from '../backend/src/db/schema/plans.js'
export type { Instance, NewInstance, InstanceStatus }     from '../backend/src/db/schema/instances.js'
export type { Invoice, NewInvoice, InvoiceStatus }        from '../backend/src/db/schema/billing.js'
export type { ActivityLog, NewActivityLog }               from '../backend/src/db/schema/monitoring.js'