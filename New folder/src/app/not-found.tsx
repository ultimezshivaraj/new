// src/app/not-found.tsx
import Link from 'next/link'
import { getSession } from '@/lib/session'

export const metadata = { title: '404 — Page Not Found | Ultimez Team' }

export default async function NotFound() {
  // Detect which panel the user is logged into
  const adminSession    = await getSession('admin')
  const employeeSession = await getSession('employee')

  const isAdmin    = !!adminSession
  const isEmployee = !!employeeSession

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');

        .nf-root {
          min-height: 100vh;
          background: var(--bg, #06080c);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family: 'DM Sans', sans-serif;
        }

        .nf-card {
          width: 100%;
          max-width: 480px;
          background: var(--bg2, #111318);
          border: 1px solid var(--border, #1e2028);
          border-radius: 20px;
          padding: 48px 40px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .nf-card::before {
          content: '';
          position: absolute;
          top: -60px; left: 50%;
          transform: translateX(-50%);
          width: 300px; height: 300px;
          background: radial-gradient(ellipse, #f59e0b18 0%, transparent 70%);
          pointer-events: none;
        }

        .nf-code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 96px;
          font-weight: 700;
          line-height: 1;
          letter-spacing: -4px;
          background: linear-gradient(135deg, #f59e0b, #d38909);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 16px;
          display: block;
        }

        .nf-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--text4, #52525b);
          margin-bottom: 20px;
        }

        .nf-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--text, #e4e4e7);
          margin-bottom: 10px;
          letter-spacing: -0.3px;
        }

        .nf-desc {
          font-size: 13px;
          color: var(--text3, #71717a);
          line-height: 1.7;
          margin-bottom: 36px;
        }

        .nf-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .nf-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 22px;
          border-radius: 10px;
          background: linear-gradient(135deg, #f59e0b, #d38909);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          text-decoration: none;
          transition: opacity 0.15s, transform 0.15s;
          border: none;
          cursor: pointer;
        }
        .nf-btn-primary:hover {
          opacity: 0.88;
          transform: translateY(-1px);
        }

        .nf-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 22px;
          border-radius: 10px;
          background: transparent;
          color: var(--text2, #a1a1aa);
          font-size: 13px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          text-decoration: none;
          border: 1px solid var(--border2, #25272f);
          transition: border-color 0.15s, color 0.15s, transform 0.15s;
          cursor: pointer;
        }
        .nf-btn-secondary:hover {
          border-color: var(--text4, #52525b);
          color: var(--text, #e4e4e7);
          transform: translateY(-1px);
        }

        .nf-divider {
          width: 40px;
          height: 2px;
          background: linear-gradient(90deg, #f59e0b, #d38909);
          border-radius: 2px;
          margin: 0 auto 24px;
        }
      `}</style>

      <div className="nf-root">
        <div className="nf-card">
          <span className="nf-code">404</span>
          <div className="nf-label">Page Not Found</div>
          <div className="nf-divider" />
          <div className="nf-title">We lost this page</div>
          <p className="nf-desc">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            Double-check the URL or head back to a safe place.
          </p>

          <div className="nf-actions">
            {/* Both sessions active — show both buttons */}
            {isAdmin && isEmployee && (
              <>
                <Link href="/employee/dashboard" className="nf-btn-primary">
                  ◈ My Dashboard
                </Link>
                <Link href="/admin/employees" className="nf-btn-secondary">
                  ⌥ Admin Panel
                </Link>
              </>
            )}

            {/* Employee only */}
            {isEmployee && !isAdmin && (
              <Link href="/employee/dashboard" className="nf-btn-primary">
                ◈ My Dashboard
              </Link>
            )}

            {/* Admin only */}
            {isAdmin && !isEmployee && (
              <Link href="/admin/employees" className="nf-btn-primary">
                ⌥ Admin Panel
              </Link>
            )}

            {/* Not logged in — show both login links */}
            {!isAdmin && !isEmployee && (
              <>
                <Link href="/employee/login" className="nf-btn-primary">
                  ◈ Employee Login
                </Link>
                <Link href="/admin/login" className="nf-btn-secondary">
                  ⌥ Admin Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}