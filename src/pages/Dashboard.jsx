import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const TODAY = new Date().toISOString().slice(0, 10)

function fmt12(t) {
  if (!t) return '—'
  const [h, m] = t.slice(0, 5).split(':')
  const hr = parseInt(h, 10)
  return `${hr % 12 || 12}:${m} ${hr < 12 ? 'am' : 'pm'}`
}

function StatusPill({ status }) {
  const map = {
    confirmed: { label: 'Confirmed', color: '#4CC97A' },
    pending:   { label: 'Pending',   color: '#C9A84C' },
    cancelled: { label: 'Cancelled', color: '#C94C4C' },
    completed: { label: 'Completed', color: '#4C9BE0' },
  }
  const s = map[status] ?? { label: status, color: '#888' }
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase',
      padding: '3px 8px', borderRadius: 3,
      background: s.color + '22', color: s.color, border: `1px solid ${s.color}44`,
    }}>
      {s.label}
    </span>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [member, setMember]       = useState(null)
  const [upcoming, setUpcoming]   = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      const [mRes, bRes] = await Promise.all([
        supabase
          .from('members')
          .select('*')
          .eq('email', user.email)
          .maybeSingle(),
        supabase
          .from('bookings')
          .select('id, booking_ref, booking_date, start_time, status, services(name), practitioners(name)')
          .eq('client_email', user.email)
          .gte('booking_date', TODAY)
          .neq('status', 'cancelled')
          .order('booking_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(3),
      ])
      setMember(mRes.data)
      setUpcoming(bRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [user])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const firstName = member?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  return (
    <div className="cp-page">
      {/* Header */}
      <div className="cp-dash-header">
        <div className="cp-dash-greeting">{greeting()},</div>
        <div className="cp-dash-name">{firstName}</div>
        {member?.membership_status && (
          <div className="cp-membership-badge">
            {member.membership_status.replace(/_/g, ' ')}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="cp-quick-row">
        <Link to="/book" className="cp-quick-card cp-quick-primary">
          <span className="cp-quick-icon">📅</span>
          <span>Book a Session</span>
        </Link>
        <Link to="/bookings" className="cp-quick-card">
          <span className="cp-quick-icon">◷</span>
          <span>My Bookings</span>
        </Link>
        <Link to="/profile" className="cp-quick-card">
          <span className="cp-quick-icon">👤</span>
          <span>My Profile</span>
        </Link>
      </div>

      {/* Upcoming bookings */}
      <div className="cp-section">
        <div className="cp-section-hd">
          <h2 className="cp-section-title">Upcoming Sessions</h2>
          <Link to="/bookings" className="cp-section-link">View all →</Link>
        </div>

        {loading ? (
          <div className="cp-loading"><div className="cp-spinner" /></div>
        ) : upcoming.length === 0 ? (
          <div className="cp-empty">
            <p>No upcoming sessions.</p>
            <Link to="/book" className="cp-btn-primary">Book Now</Link>
          </div>
        ) : (
          <div className="cp-booking-list">
            {upcoming.map(b => (
              <div key={b.id} className="cp-booking-card">
                <div className="cp-booking-date">
                  <div className="cp-booking-day">
                    {new Date(b.booking_date).toLocaleDateString('en-ZA', { weekday: 'short' })}
                  </div>
                  <div className="cp-booking-num">
                    {new Date(b.booking_date).getDate()}
                  </div>
                  <div className="cp-booking-month">
                    {new Date(b.booking_date).toLocaleDateString('en-ZA', { month: 'short' })}
                  </div>
                </div>
                <div className="cp-booking-info">
                  <div className="cp-booking-service">{b.services?.name || '—'}</div>
                  {b.practitioners?.name && (
                    <div className="cp-booking-with">with {b.practitioners.name}</div>
                  )}
                  <div className="cp-booking-time">{fmt12(b.start_time)}</div>
                </div>
                <div className="cp-booking-status">
                  <StatusPill status={b.status} />
                  <div className="cp-booking-ref">{b.booking_ref}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Membership info */}
      {member && (
        <div className="cp-section">
          <h2 className="cp-section-title">My Membership</h2>
          <div className="cp-membership-card">
            <div className="cp-membership-row">
              <span className="cp-membership-label">Status</span>
              <span className="cp-membership-value" style={{ textTransform: 'capitalize' }}>
                {member.membership_status?.replace(/_/g, ' ') || '—'}
              </span>
            </div>
            {member.membership_type && (
              <div className="cp-membership-row">
                <span className="cp-membership-label">Plan</span>
                <span className="cp-membership-value">{member.membership_type}</span>
              </div>
            )}
            {member.membership_expiry && (
              <div className="cp-membership-row">
                <span className="cp-membership-label">Valid until</span>
                <span className="cp-membership-value">
                  {new Date(member.membership_expiry).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
