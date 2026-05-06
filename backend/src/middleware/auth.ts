import type { Context, Next } from 'hono'
import { auth } from '../lib/auth.js'

/**
 * Middleware: pastikan request punya session aktif.
 * Kalau tidak ada session, langsung 401.
 */
export async function requireAuth(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    return c.json(
      { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
      401,
    )
  }

  // Simpan di context supaya handler downstream bisa akses tanpa re-fetch
  c.set('user', session.user)
  c.set('session', session.session)

  await next()
}

/**
 * Middleware: pastikan user punya salah satu role yang diizinkan.
 * Wajib dipasang setelah requireAuth.
 *
 * @example
 * app.get('/admin', requireAuth, requireRole('admin', 'superAdmin'), handler)
 */
export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as { role?: string } | undefined

    if (!user || !roles.includes(user.role ?? '')) {
      return c.json(
        { data: null, error: { message: 'Forbidden', code: 'FORBIDDEN' } },
        403,
      )
    }

    await next()
  }
}