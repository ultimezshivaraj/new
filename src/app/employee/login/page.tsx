import LoginForm from '@/components/shared/LoginForm'

export const metadata = { title: 'Employee Login — Ultimez Team' }

export default function EmployeeLoginPage() {
  return (
    <LoginForm
      panel="employee"
      title="Employee Panel"
      subtitle="Ultimez Team — Sign in with your email or username"
      accentColor="#6366f1"
      loginIdLabel="Email or Username"
      loginIdKey="loginId"
      apiEndpoint="/api/auth/employee"
      redirectTo="/employee/dashboard"
      logo="◉"
    />
  )
}
