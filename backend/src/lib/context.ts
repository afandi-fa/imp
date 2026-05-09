import type { Context } from 'hono'

export type AppUser = {
  id: string
  role?: string
  email: string
  name: string
}

export type AppVariables = {
  user: AppUser
  session: Record<string, unknown>
}

export type AppContext = Context<{ Variables: AppVariables }>