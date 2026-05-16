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
    confirmed: { label: 'Confirmed', color: 'var(--green)',  bg: 'var(--green-dim)' },
    pending:   { label: 'Pending',   color: 'var(--gold)',   bg: 'var(--gold-dim)'  },
    cancelled: { label: 'Cancelled', color: 'var(--red)',    bg: 'var(--red-dim)'   },
    completed: { label: 'Completed', color: 'var(--blue)',   bg: 'rgba(59,130,196,.1)' },
  }
  const s = map[status] ?? { label: status, color: '#888', bg: 'rgba(136,136,136,.1)' }
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase',
      padding: '4px 8px', borderRadius: 4,
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { user } = useAuth()
  const [member,   setMember]   = useState(null)
  const [upcoming, setUpcoming] = useState([])
  const [stats,    setStats]    = useState({ total: 0, attended: 0 })
  const [deals,    setDeals]    = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)

      const [mRes, bRes, allRes, dealsRes] = await Promise.all([
        supabase
          .from('members')
          .select('*')
          .eq('email', user.email)
          .maybeSingle(),

        // upcoming (next 3)
        supabase
          .from('bookings')
          .select('id, booking_ref, booking_date, start_time, status, services(name), practitioners(name)')
          .eq('client_email', user.email)
          .gte('booking_date', TODAY)
          .neq('status', 'cancelled')
          .order('booking_date', { ascending: true })
          .order('start_time',   { ascending: true })
          .limit(3),

        // all bookings for stats
        supabase
          .from('bookings')
          .select('status')
          .eq('client_email', user.email),

        // deals
        supabase
          .from('deals')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(1),
      ])

      setMember(mRes.data)
      setUpcoming(bRes.data ?? [])

      const all = allRes.data ?? []
      setStats({
        total:    all.length,
        attended: all.filter(b => b.status === 'completed').length,
      })

      setDeals(dealsRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [user])

  const firstName = member?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  // next upcoming booking
  const next = upcoming[0]

  return (
    <div className="cp-page">

      {/* ── Dark hero header ── */}
      <div className="cp-home-hero">
        <img
          src="/logo-icon.png"
          alt="Maddog Performance Institute"
          className="cp-home-logo"
        />
        <div className="cp-home-greeting">{greeting()},</div>
        <div className="cp-home-name">{firstName}</div>

        {member?.membership_status && (
          <div className="cp-streak-chip">
            <span>🏆</span>
            <span>{member.membership_status.replace(/_/g, ' ')}</span>
          </div>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="cp-stats-row">
        <div className="cp-stat-card">
          <div className="cp-stat-value">{stats.total}</div>
          <div className="cp-stat-label">Sessions</div>
        </div>
        <div className="cp-stat-card">
          <div className="cp-stat-value">{stats.attended}</div>
          <div className="cp-stat-label">Attended</div>
        </div>
        <div className="cp-stat-card">
          <div className="cp-stat-value">{upcoming.length}</div>
          <div className="cp-stat-label">Upcoming</div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="cp-quick-row">
        <Link to="/book" className="cp-quick-card cp-quick-primary">
          <span className="cp-quick-icon">📅</span>
          <span>Book</span>
        </Link>
        <Link to="/bookings" className="cp-quick-card">
          <span className="cp-quick-icon">◷</span>
          <span>Bookings</span>
        </Link>
        <Link to="/explore" className="cp-quick-card">
          <span className="cp-quick-icon">✦</span>
          <span>Explore</span>
        </Link>
      </div>

      {/* ── Next session highlight ── */}
      {!loading && next && (
        <div className="cp-section">
          <div className="cp-section-hd">
            <h2 className="cp-section-title">Next Session</h2>
            <Link to="/bookings" className="cp-section-link">View all →</Link>
          </div>
          <div className="cp-next-booking">
            <div className="cp-next-label">Coming up</div>
            <div className="cp-next-service">{next.services?.name || '—'}</div>
            <div className="cp-next-meta">
              {next.practitioners?.name ? `with ${next.practitioners.name}` : ''}
            </div>
            <div className="cp-next-time">
              {new Date(next.booking_date).toLocaleDateString('en-ZA', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
              {' · '}{fmt12(next.start_time)}
            </div>
          </div>
        </div>
      )}

      {/* ── Upcoming bookings list ── */}
      <div className="cp-section">
        {!next && (
          <div className="cp-section-hd">
            <h2 className="cp-section-title">Upcoming Sessions</h2>
            <Link to="/bookings" className="cp-section-link">View all →</Link>
          </div>
        )}

        {loading ? (
          <div className="cp-loading"><div className="cp-spinner" /></div>
        ) : upcoming.length === 0 ? (
          <div className="cp-empty">
            <p>No upcoming sessions booked.</p>
            <Link to="/book" className="cp-btn-primary">Book Now</Link>
          </div>
        ) : (
          next && upcoming.length > 1 && (
            <>
              <div className="cp-section-hd" style={{ marginTop: 24 }}>
                <h2 className="cp-section-title">Also coming up</h2>
              </div>
              <div className="cp-booking-list">
                {upcoming.slice(1).map(b => (
                  <div key={b.id} className="cp-booking-card">
                    <div className="cp-booking-date">
                      <div className="cp-booking-day">
                        {new Date(b.booking_date).toLocaleDateString('en-ZA', { weekday: 'short' })}
                      </div>
                      <div className="cp-booking-num">{new Date(b.booking_date).getDate()}</div>
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
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        )}
      </div>

      {/* ── Deal banner ── */}
      {deals.length > 0 && (
        <div className="cp-section">
          <h2 className="cp-section-title">Special Offer</h2>
          <Link to="/explore" className="cp-deal-banner">
            <span className="cp-deal-icon">🔥</span>
            <div>
              <div className="cp-deal-label">Limited time</div>
              <div className="cp-deal-title">{deals[0].title}</div>
              <div className="cp-deal-price">{deals[0].subtitle || 'Tap to learn more'}</div>
            </div>
            <span className="cp-deal-arrow">›</span>
          </Link>
        </div>
      )}

      {/* ── Membership card ── */}
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
                  {new Date(member.membership_expiry).toLocaleDateString('en-ZA', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
