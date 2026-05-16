import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  return (
    <div className="login-root">
      {/* Dark hero */}
      <div className="login-hero">
        <img
          src="/logo-icon.png"
          alt="Maddog Performance Institute"
          className="login-logo"
        />
        <div className="login-tagline">Member Portal</div>
      </div>

      {/* White card slides up */}
      <div className="login-card">
        {sent ? (
          <div className="login-sent">
            <div className="login-sent-icon">✉</div>
            <h2>Check your email</h2>
            <p>
              We've sent a login link to <strong>{email}</strong>.<br />
              Tap the link to sign in — no password needed.
            </p>
            <button className="login-resend" onClick={() => setSent(false)}>
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="login-card-title">Welcome back</h2>
            <p className="login-card-sub">
              Enter your email and we'll send a secure login link — no password needed.
            </p>

            {error && <div className="login-error">{error}</div>}

            <div className="login-field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send Login Link'}
            </button>

            <div className="login-gold-line" />

            <p className="login-help">
              Not a member yet?{' '}
              <a href="mailto:info@maddogperformance.co.za">
                Get in touch
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
