import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './lib/auth.js'



import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db } from './db/index.js'  // sesuaikan import db kamu

// Auto migrate saat startup
await migrate(db, { migrationsFolder: './migrations' })

console.log('Migration done')




const app = new Hono()
// ─── CORS ────────────────────────────────────────────────────────────────────
// Whitelist eksplisit — jangan pakai wildcard * di production
app.use(
  '*',
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true, // wajib untuk session cookie
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
// Semua endpoint /api/auth/* dihandle Better Auth — jangan buat manual
app.on(['GET', 'POST'], '/api/auth/*', (c) => {
  return auth.handler(c.req.raw)
})




// ─── Domain Routes (tambah di sini setelah Fase 3+) ──────────────────────────
// import { nodesRouter } from './routes/nodes.js'
// app.route('/api/nodes', nodesRouter)

// ─── Start Server ─────────────────────────────────────────────────────────────
app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw))

serve({
  fetch: app.fetch,
  port: Number(process.env.PORT) || 3000,
}, (info) => {
  console.log(`Backend running on http://localhost:${info.port}`)
})