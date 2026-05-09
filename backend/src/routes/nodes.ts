import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { insertNodeSchema, updateNodeSchema } from '../db/validators/nodes.js'
import * as nodesService from '../services/nodes.service.js'

const nodes = new Hono()

nodes.use('*', requireAuth, requireRole('admin', 'superAdmin'))

nodes.get('/', async (c) => {
  const data = await nodesService.listNodes()
  return c.json({ data, error: null })
})

nodes.get('/:id', async (c) => {
  const data = await nodesService.getNode(c.req.param('id'))
  if (!data) return c.json({ data: null, error: { message: 'Node not found', code: 'NOT_FOUND' } }, 404)
  return c.json({ data, error: null })
})

nodes.post('/', zValidator('json', insertNodeSchema), async (c) => {
  const body = c.req.valid('json')
  const data = await nodesService.createNode(body)
  return c.json({ data, error: null }, 201)
})

nodes.patch('/:id', zValidator('json', updateNodeSchema), async (c) => {
  const body = c.req.valid('json')
  const data = await nodesService.updateNode(c.req.param('id'), body)
  if (!data) return c.json({ data: null, error: { message: 'Node not found', code: 'NOT_FOUND' } }, 404)
  return c.json({ data, error: null })
})

nodes.delete('/:id', async (c) => {
  const data = await nodesService.deleteNode(c.req.param('id'))
  if (!data) return c.json({ data: null, error: { message: 'Node not found', code: 'NOT_FOUND' } }, 404)
  return c.json({ data, error: null })
})

export default nodes