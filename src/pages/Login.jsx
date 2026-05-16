import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail]   = useState('')
  const [sent, setSent]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="login-root">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-label">Performance Institute</div>
          <div className="login-brand-name">MADDOG</div>
          <div className="login-brand-sub">Member Portal</div>
        </div>

        {sent ? (
          <div className="login-sent">
            <div className="login-sent-icon">✉</div>
            <h2>Check your email</h2>
            <p>We've sent a login link to <strong>{email}</strong>.<br />Click the link in the email to sign in.</p>
            <button className="login-resend" onClick={() => setSent(false)}>
              Use a different email
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <h2 className="login-title">Sign In</h2>
            <p className="login-subtitle">Enter your email and we'll send you a secure login link — no password needed.</p>

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

            <p className="login-help">
              Not a member yet?{' '}
              <a href="https://maddogperformance.co.za/booking.html" target="_blank" rel="noopener noreferrer">
                Book a trial class
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
