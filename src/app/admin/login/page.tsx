import LoginForm from '@/components/shared/LoginForm'

export const metadata = { title: 'Admin Login — Coinpedia AI' }

export default function AdminLoginPage() {
  return (
    <LoginForm
      panel="admin"
      title="Admin Panel"
      subtitle="Coinpedia AI — Restricted access"
      accentColor="#ef4444"
      loginIdLabel="Admin Email"
      loginIdKey="emailId"
      apiEndpoint="/api/auth/admin"
      redirectTo="/admin"
      logo="⚡"
    />
  )
}
