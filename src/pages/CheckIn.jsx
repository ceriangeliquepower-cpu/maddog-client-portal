import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function CheckIn() {
  const { user } = useAuth()
  const [status,  setStatus]  = useState('checking') // checking | success | already | error
  const [member,  setMember]  = useState(null)

  // Always use the logged-in member's email — gym QR is a single static code
  const targetEmail = user?.email

  useEffect(() => {
    if (!targetEmail) { setStatus('error'); return }
    doCheckIn()
  }, [targetEmail])

  const doCheckIn = async () => {
    try {
      // Load member record
      const { data: mem } = await supabase
        .from('members')
        .select('id, name, membership_status')
        .eq('email', targetEmail)
        .maybeSingle()

      setMember(mem)

      // Check if already checked in today
      const today = new Date().toISOString().slice(0, 10)
      const { data: existing } = await supabase
        .from('check_ins')
        .select('id')
        .eq('member_email', targetEmail)
        .eq('check_in_date', today)
        .maybeSingle()

      if (existing) {
        setStatus('already')
        return
      }

      // Record the check-in
      const { error } = await supabase.from('check_ins').insert({
        member_email:  targetEmail,
        member_id:     mem?.id || null,
        check_in_date: today,
        checked_in_at: new Date().toISOString(),
      })

      if (error) throw error
      setStatus('success')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  const displayName = member?.name?.split(' ')[0] || targetEmail?.split('@')[0] || 'Member'

  return (
    <div className="cp-page cp-book-done">

      {status === 'checking' && (
        <>
          <div className="cp-spinner" style={{ width: 56, height: 56, margin: '0 auto 24px' }} />
          <h2 className="cp-done-title">Checking in…</h2>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="cp-done-icon" style={{ background: 'rgba(45,158,95,.12)', borderColor: '#2D9E5F', color: '#2D9E5F', fontSize: 44 }}>
            ✓
          </div>
          <h2 className="cp-done-title">Welcome in, {displayName}!</h2>
          {member?.membership_status && (
            <div className="cp-membership-badge" style={{ margin: '0 auto 12px' }}>
              {member.membership_status.replace(/_/g, ' ')}
            </div>
          )}
          <p className="cp-done-sub">Your visit has been logged. Have a great session! 💪</p>
          <Link to="/dashboard" className="cp-btn-primary" style={{ width: '100%' }}>
            Go to Dashboard
          </Link>
        </>
      )}

      {status === 'already' && (
        <>
          <div className="cp-done-icon" style={{ fontSize: 44 }}>⚡</div>
          <h2 className="cp-done-title">Already checked in!</h2>
          <p className="cp-done-sub">
            You've already been logged for today, {displayName}. You're all good — enjoy your session!
          </p>
          <Link to="/dashboard" className="cp-btn-primary" style={{ width: '100%' }}>
            Go to Dashboard
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="cp-done-icon" style={{ background: 'rgba(217,64,64,.1)', borderColor: '#D94040', color: '#D94040', fontSize: 44 }}>
            ✕
          </div>
          <h2 className="cp-done-title">Check-in failed</h2>
          <p className="cp-done-sub">
            Something went wrong. Please make sure you're logged in and try again, or ask a staff member for help.
          </p>
          <Link to="/dashboard" className="cp-btn-primary" style={{ width: '100%' }}>
            Back to Home
          </Link>
        </>
      )}

    </div>
  )
}
