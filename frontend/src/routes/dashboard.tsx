import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { useSession, signOut } from '../lib/auth-client'
import { authClient } from '../lib/auth-client'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    if (!session) {
      throw redirect({ to: '/login' })
    }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { data: session } = useSession()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate({ to: '/login' })
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Selamat datang, {session?.user.name}!</p>
      <p>Email: {session?.user.email}</p>
      <p>Role: {session?.user.role}</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  )
}