import { createAccessControl } from 'better-auth/plugins/access'
import { defaultStatements } from 'better-auth/plugins/admin/access'

const statement = {
  ...defaultStatements,
  node:     ['create', 'read', 'update', 'delete'] as const,
  instance: ['create', 'read', 'update', 'delete', 'start', 'stop'] as const,
  plan:     ['create', 'read', 'update', 'delete'] as const,
  invoice:  ['read', 'manage'] as const,
} as const

export const ac = createAccessControl(statement)

export const userRole = ac.newRole({
  instance: ['create', 'read', 'update', 'stop'],
  invoice:  ['read'],
})

export const adminRole = ac.newRole({
  node:     ['create', 'read', 'update', 'delete'],
  instance: ['create', 'read', 'update', 'delete', 'start', 'stop'],
  plan:     ['create', 'read', 'update', 'delete'],
  invoice:  ['read', 'manage'],
  user:     ['create', 'delete', 'ban', 'set-password', 'list'],
  session:  ['list', 'revoke'],
})

export const superAdminRole = ac.newRole({
  ...adminRole.statements,
  user: [...adminRole.statements.user, 'impersonate', 'set-role'],
})