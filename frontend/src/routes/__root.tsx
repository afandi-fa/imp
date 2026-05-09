import * as React from 'react'
import { Outlet, createRootRoute, Link, useLocation } from '@tanstack/react-router'
import { useSession, signOut } from '../lib/auth-client'
import { useNavigate } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootComponent,
})

// Halaman yang tidak perlu navbar
const AUTH_ROUTES = ['/login', '/register', '/']

function Navbar() {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const role = session?.user.role as string | undefined

  // Sembunyikan navbar di halaman auth
  if (AUTH_ROUTES.includes(location.pathname)) return null
  if (!session) return null

  const handleLogout = async () => {
    await signOut()
    navigate({ to: '/login' })
  }

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '0.75rem 1.5rem',
      borderBottom: '1px solid #e5e7eb',
      background: '#fff',
      fontSize: '0.875rem',
    }}>
      {/* Nav links */}
      <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
      <Link to="/instances" style={linkStyle}>Instances</Link>
      <Link to="/plans" style={linkStyle}>Plans</Link>
      <Link to="/billing" style={linkStyle}>Billing</Link>
      {(role === 'admin' || role === 'superAdmin') && (
        <>
          <Link to="/nodes" style={linkStyle}>Nodes</Link>
          <Link to="/users" style={linkStyle}>Users</Link>
        </>
      )}

      {/* Spacer */}
      <span style={{ marginLeft: 'auto', color: '#6b7280' }}>
        {session.user.name} ({role})
      </span>
      <button onClick={handleLogout} style={buttonStyle}>Logout</button>
    </nav>
  )
}

const linkStyle: React.CSSProperties = {
  color: '#374151',
  textDecoration: 'none',
  padding: '0.25rem 0.5rem',
  borderRadius: '0.375rem',
}

const buttonStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  padding: '0.25rem 0.75rem',
  cursor: 'pointer',
  fontSize: '0.875rem',
  color: '#374151',
}

function RootComponent() {
  return (
    <React.Fragment>
      <Navbar />
      <Outlet />
    </React.Fragment>
  )
}