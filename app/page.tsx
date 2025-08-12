import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to login page on load
  redirect('/login')
}