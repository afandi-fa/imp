import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { insertPlanSchema, updatePlanSchema } from '../db/validators/plans.js'
import * as plansService from '../services/plans.service.js'

const plans = new Hono()

// GET publik — semua user bisa lihat plans
plans.get('/', async (c) => {
  const data = await plansService.listPlans()
  return c.json({ data, error: null })
})

plans.get('/:id', async (c) => {
  const data = await plansService.getPlan(c.req.param('id'))
  if (!data) return c.json({ data: null, error: { message: 'Plan not found', code: 'NOT_FOUND' } }, 404)
  return c.json({ data, error: null })
})

// POST/PATCH/DELETE — admin only
plans.post('/', requireAuth, requireRole('admin', 'superAdmin'), zValidator('json', insertPlanSchema), async (c) => {
  const body = c.req.valid('json')
  const data = await plansService.createPlan(body)
  return c.json({ data, error: null }, 201)
})

plans.patch('/:id', requireAuth, requireRole('admin', 'superAdmin'), zValidator('json', updatePlanSchema), async (c) => {
  const body = c.req.valid('json')
  const data = await plansService.updatePlan(c.req.param('id'), body)
  if (!data) return c.json({ data: null, error: { message: 'Plan not found', code: 'NOT_FOUND' } }, 404)
  return c.json({ data, error: null })
})

plans.delete('/:id', requireAuth, requireRole('admin', 'superAdmin'), async (c) => {
  const id = c.req.param('id')
  if (!id) return c.json({ data: null, error: { message: 'ID required', code: 'BAD_REQUEST' } }, 400)
  const data = await plansService.deletePlan(id)
  if (!data) return c.json({ data: null, error: { message: 'Plan not found', code: 'NOT_FOUND' } }, 404)
  return c.json({ data, error: null })
})

export default plans