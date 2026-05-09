import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { requireAuth } from '../middleware/auth.js'
import { insertInstanceSchema } from '../db/validators/instances.js'
import * as instancesService from '../services/instances.service.js'
import type { AppVariables } from '../lib/context.js'

const instances = new Hono<{ Variables: AppVariables }>()

instances.use('*', requireAuth)

instances.get('/', async (c) => {
  const user = c.get('user')
  const isAdmin = ['admin', 'superAdmin'].includes(user.role ?? '')
  const data = await instancesService.listInstances(user.id, isAdmin)
  return c.json({ data, error: null })
})

instances.get('/:id', async (c) => {
  const user = c.get('user')
  const isAdmin = ['admin', 'superAdmin'].includes(user.role ?? '')
  const data = await instancesService.getInstance(c.req.param('id'), user.id, isAdmin)
  if (!data) return c.json({ data: null, error: { message: 'Instance not found', code: 'NOT_FOUND' } }, 404)
  return c.json({ data, error: null })
})

instances.post('/', zValidator('json', insertInstanceSchema), async (c) => {
  const user = c.get('user')
  const body = c.req.valid('json')
  try {
    const data = await instancesService.createInstance({
      userId:  user.id,
      planId:  body.planId,
      name:    body.name,
      osImage: body.osImage,
    })
    return c.json({ data, error: null }, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create instance'
    return c.json({ data: null, error: { message, code: 'PROVISION_FAILED' } }, 400)
  }
})

instances.post('/:id/stop', async (c) => {
  const user = c.get('user')
  const isAdmin = ['admin', 'superAdmin'].includes(user.role ?? '')
  const data = await instancesService.stopInstance(c.req.param('id'), user.id, isAdmin)
  if (!data) return c.json({ data: null, error: { message: 'Instance not found', code: 'NOT_FOUND' } }, 404)
  return c.json({ data, error: null })
})

instances.post('/:id/start', async (c) => {
  const user = c.get('user')
  const isAdmin = ['admin', 'superAdmin'].includes(user.role ?? '')
  const data = await instancesService.startInstance(c.req.param('id'), user.id, isAdmin)
  if (!data) return c.json({ data: null, error: { message: 'Instance not found', code: 'NOT_FOUND' } }, 404)
  return c.json({ data, error: null })
})

instances.post('/:id/terminate', async (c) => {
  const user = c.get('user')
  const isAdmin = ['admin', 'superAdmin'].includes(user.role ?? '')
  try {
    const data = await instancesService.terminateInstance(c.req.param('id'), user.id, isAdmin)
    return c.json({ data, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to terminate instance'
    return c.json({ data: null, error: { message, code: 'TERMINATE_FAILED' } }, 400)
  }
})

export default instances