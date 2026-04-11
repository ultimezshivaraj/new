'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

interface LoginFormProps {
  panel:        'employee' | 'client' | 'admin'
  title:        string
  subtitle:     string
  accentColor:  string
  loginIdLabel: string    // 'Email or Username' / 'Email' / 'Admin Email'
  loginIdKey:   string    // 'loginId' / 'emailId' / 'emailId'
  apiEndpoint:  string    // '/api/auth/employee'
  redirectTo:   string    // '/employee/dashboard'
  logo?:        string    // emoji or text
}

export default function LoginForm(props: LoginFormProps) {
  const { panel, title, subtitle, accentColor, loginIdLabel, loginIdKey, apiEndpoint, redirectTo, logo } = props
  const router = useRouter()
  const [loginId, setLoginId]   = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showPass, setShowPass] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const body: Record<string, string> = { password }
      body[loginIdKey] = loginId.trim()

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Login failed. Please try again.')
        return
      }

      router.push(redirectTo)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const accent = accentColor

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      backgroundImage: `radial-gradient(ellipse 800px 400px at 50% -50px, ${accent}18, transparent)`,
      padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16, padding: '40px 36px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Logo + title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px',
            background: `linear-gradient(135deg, ${accent}, ${accent}88)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
          }}>
            {logo ?? '🔐'}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>{title}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>{subtitle}</div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Login ID field */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', marginBottom: 6 }}>
              {loginIdLabel}
            </label>
            <input
              type={panel === 'employee' ? 'text' : 'email'}
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
              placeholder={panel === 'employee' ? 'email or username' : 'your@email.com'}
              required
              autoFocus
              style={{
                width: '100%', padding: '11px 14px',
                background: 'var(--bg3)', border: `1px solid ${error ? 'var(--red)' : 'var(--border2)'}`,
                borderRadius: 8, color: 'var(--text)', fontSize: 13,
                fontFamily: 'var(--font-sans)', outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { if (!error) e.target.style.borderColor = accent }}
              onBlur={e => { if (!error) e.target.style.borderColor = 'var(--border2)' }}
            />
          </div>

          {/* Password field */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', padding: '11px 40px 11px 14px',
                  background: 'var(--bg3)', border: `1px solid ${error ? 'var(--red)' : 'var(--border2)'}`,
                  borderRadius: 8, color: 'var(--text)', fontSize: 13,
                  fontFamily: 'var(--font-sans)', outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => { if (!error) e.target.style.borderColor = accent }}
                onBlur={e => { if (!error) e.target.style.borderColor = 'var(--border2)' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--muted)', fontSize: 14,
                }}
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              background: '#7f1d1d33', border: '1px solid #ef444444',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              fontSize: 12, color: '#fca5a5',
            }}>
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px',
              background: loading ? `${accent}88` : accent,
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', letterSpacing: 0.3,
            }}
          >
            {loading ? 'Signing in…' : `Sign in to ${title}`}
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: 'var(--subtle)' }}>
          Coinpedia AI — {title} · Powered by BigQuery
        </div>
      </div>
    </div>
  )
}
