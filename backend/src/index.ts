import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './lib/auth.js'
import nodesRoute from './routes/nodes'
import plansRoute from './routes/plans'
import instancesRoute from './routes/instances'
import usersRoute from './routes/users.js'
import billingRoute from './routes/billing.js'
import { markOverdueInvoices, checkAndSuspendOverdue } from './services/billing.service.js'

const app = new Hono()

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(
  '*',
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  }),
)

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error('[Error]', err)
  return c.json(
    {
      data: null,
      error: {
        message: err.message ?? 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    },
    500,
  )
})

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ data: { status: 'ok' }, error: null, ts: Date.now() }))

// ─── Auth Routes (Better Auth) ────────────────────────────────────────────────
app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))

app.route('/api/nodes', nodesRoute)
app.route('/api/plans', plansRoute)
app.route('/api/instances', instancesRoute)
app.route('/api/users', usersRoute)
app.route('/api/billing', billingRoute)

// ─── Start Server ─────────────────────────────────────────────────────────────
app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw))

serve(
  {
    fetch: app.fetch,
    port: Number(process.env.PORT) || 3000,
  },
  (info) => {
    console.log(`Backend running on http://localhost:${info.port}`)
    startCronJobs()
  },
)

// ─── Cron Jobs ────────────────────────────────────────────────────────────────

const HOUR_MS = 60 * 60 * 1000

function startCronJobs() {
  runBillingCheck()
  setInterval(runBillingCheck, HOUR_MS)

  console.log('[Cron] Billing check scheduled every hour')
}

async function runBillingCheck() {
  try {
    await markOverdueInvoices()

    await checkAndSuspendOverdue('', true)

    console.log(`[Cron] Billing check completed at ${new Date().toISOString()}`)
  } catch (err) {
    console.error('[Cron] Billing check failed:', err)
  }
}