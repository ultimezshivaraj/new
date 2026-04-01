import LoginForm from '@/components/shared/LoginForm'

export const metadata = { title: 'Client Login — Ultimez' }

export default function ClientLoginPage() {
  return (
    <LoginForm
      panel="client"
      title="Client Portal"
      subtitle="Track your projects and updates"
      accentColor="#06b6d4"
      loginIdLabel="Email Address"
      loginIdKey="emailId"
      apiEndpoint="/api/auth/client"
      redirectTo="/client/dashboard"
      logo="🏢"
    />
  )
}
