import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins'
import { db } from '../db/index.js'
import * as authSchema from '../db/schema/auth.js'
import { ac, userRole, adminRole, superAdminRole } from '@imp/shared/permissions'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
  }),
  baseURL: "https://abae.my.id",
  basePath: "/api/auth",
    trustedOrigins: [process.env.FRONTEND_URL!],


  emailAndPassword: {
    enabled: true,
  },

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // cache session 5 menit di cookie
    },
  },

  plugins: [
  admin({
    ac,
    roles: {
      user: userRole,
      admin: adminRole,
      superAdmin: superAdminRole,
    },
  }),
],
})