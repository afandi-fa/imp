import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/"!
    <p>Sudah punya akun? <Link  to="/login">Register</Link></p>
    <p>Belum punya akun? <Link to="/register">Register</Link></p>
  </div>
  

}
