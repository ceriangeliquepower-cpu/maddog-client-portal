import { useState, useEffect, useCallback } from 'react'
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

const STATUS_COLOR = {
  confirmed: '#4CC97A',
  pending:   '#C9A84C',
  cancelled: '#C94C4C',
  completed: '#4C9BE0',
}

export default function MyBookings() {
  const { user } = useAuth()
  const [tab, setTab]           = useState('upcoming')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const [toast, setToast]       = useState('')

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const query = supabase
      .from('bookings')
      .select('id, booking_ref, booking_date, start_time, end_time, status, notes, services(name), practitioners(name)')
      .eq('client_email', user.email)
      .order('booking_date', { ascending: tab === 'upcoming' })
      .order('start_time', { ascending: true })

    if (tab === 'upcoming') {
      query.gte('booking_date', TODAY).neq('status', 'cancelled')
    } else {
      query.or(`booking_date.lt.${TODAY},status.eq.cancelled`)
    }

    const { data } = await query
    setBookings(data ?? [])
    setLoading(false)
  }, [user, tab])

  useEffect(() => { load() }, [load])

  const handleCancel = async (id, bookingDate) => {
    // Check 24hr rule
    const bDate = new Date(bookingDate + 'T00:00:00')
    const now   = new Date()
    const diffHrs = (bDate - now) / 36e5
    if (diffHrs < 24) {
      showToast('Bookings can only be cancelled more than 24 hours in advance. Please call us directly.')
      return
    }
    if (!window.confirm('Are you sure you want to cancel this booking?')) return
    setCancelling(id)
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    showToast('Booking cancelled.')
    setCancelling(null)
    load()
  }

  return (
    <div className="cp-page">
      <div className="cp-page-header">
        <h1 className="cp-page-title">My Bookings</h1>
        <Link to="/book" className="cp-btn-primary">+ Book</Link>
      </div>

      <div className="cp-tabs">
        <button className={`cp-tab${tab === 'upcoming' ? ' active' : ''}`} onClick={() => setTab('upcoming')}>Upcoming</button>
        <button className={`cp-tab${tab === 'past' ? ' active' : ''}`} onClick={() => setTab('past')}>Past</button>
      </div>

      {loading ? (
        <div className="cp-loading"><div className="cp-spinner" /></div>
      ) : bookings.length === 0 ? (
        <div className="cp-empty">
          <p>{tab === 'upcoming' ? 'No upcoming bookings.' : 'No past bookings.'}</p>
          {tab === 'upcoming' && <Link to="/book" className="cp-btn-primary">Book a Session</Link>}
        </div>
      ) : (
        <div className="cp-booking-list">
          {bookings.map(b => {
            const color = STATUS_COLOR[b.status] ?? '#888'
            const isPast = b.booking_date < TODAY || b.status === 'cancelled' || b.status === 'completed'
            return (
              <div key={b.id} className="cp-booking-card" style={{ borderLeftColor: color }}>
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
                  <div className="cp-booking-time">
                    {fmt12(b.start_time)}{b.end_time ? ` – ${fmt12(b.end_time)}` : ''}
                  </div>
                  <div className="cp-booking-ref">{b.booking_ref}</div>
                </div>
                <div className="cp-booking-actions">
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '.12em',
                    textTransform: 'uppercase', color, display: 'block', marginBottom: 8,
                  }}>
                    {b.status}
                  </span>
                  {!isPast && b.status !== 'cancelled' && (
                    <button
                      className="cp-cancel-btn"
                      onClick={() => handleCancel(b.id, b.booking_date)}
                      disabled={cancelling === b.id}
                    >
                      {cancelling === b.id ? '…' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && <div className="cp-toast">{toast}</div>}
    </div>
  )
}
