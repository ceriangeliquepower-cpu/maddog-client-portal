import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const STEPS = ['Service', 'Practitioner', 'Date & Time', 'Confirm']

function genRef() {
  return 'MDB-' + Math.random().toString(36).slice(2, 7).toUpperCase()
}

function nextDates(count = 21) {
  const dates = []
  const d = new Date()
  for (let i = 0; i < count; i++) {
    d.setDate(d.getDate() + 1)
    dates.push(new Date(d))
  }
  return dates
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10)
}

function fmt12(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h, 10)
  return `${hr % 12 || 12}:${m} ${hr < 12 ? 'am' : 'pm'}`
}

function fmtPrice(cents) {
  return `R${(cents / 100).toFixed(2)}`
}

export default function BookSession() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const pfFormRef = useRef(null)

  const [step, setStep]             = useState(0)
  const [services, setServices]     = useState([])
  const [practitioners, setPractitioners] = useState([])
  const [availability, setAvailability]   = useState([])
  const [existingBookings, setExistingBookings] = useState([])

  const [selectedService, setSelectedService]           = useState(null)
  const [selectedPractitioner, setSelectedPractitioner] = useState(null)
  const [selectedDate, setSelectedDate]                 = useState(null)
  const [selectedTime, setSelectedTime]                 = useState(null)
  const [notes, setNotes]                               = useState('')

  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast]           = useState('')

  // PayFast redirect state
  const [pfFields, setPfFields]     = useState(null)
  const [pfUrl, setPfUrl]           = useState('')

  // Free booking done state
  const [done, setDone]             = useState(false)
  const [bookingRef, setBookingRef] = useState('')

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [sRes, pRes] = await Promise.all([
        supabase.from('services')
          .select('id, name, category, duration_minutes, price_cents, description')
          .eq('active', true).order('category').order('name'),
        supabase.from('practitioners')
          .select('id, name, role, color, photo_url')
          .eq('active', true).order('display_order'),
      ])
      setServices(sRes.data ?? [])
      setPractitioners(pRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // Load availability + existing bookings when practitioner selected
  useEffect(() => {
    if (!selectedPractitioner) return
    const load = async () => {
      const [avRes, bkRes] = await Promise.all([
        supabase.from('availability').select('*').eq('practitioner_id', selectedPractitioner.id),
        supabase.from('bookings')
          .select('booking_date, start_time, end_time')
          .eq('practitioner_id', selectedPractitioner.id)
          .gte('booking_date', toDateStr(new Date()))
          .neq('status', 'cancelled'),
      ])
      setAvailability(avRes.data ?? [])
      setExistingBookings(bkRes.data ?? [])
    }
    load()
  }, [selectedPractitioner])

  // Auto-submit PayFast form when fields are ready
  useEffect(() => {
    if (pfFields && pfFormRef.current) {
      pfFormRef.current.submit()
    }
  }, [pfFields])

  const servicesByCategory = services.reduce((acc, s) => {
    ;(acc[s.category] ??= []).push(s)
    return acc
  }, {})

  const availableDates = nextDates(21).filter(d => {
    const dow = d.getDay()
    return availability.some(a => a.day_of_week === dow && a.active !== false)
  })

  const getSlots = () => {
    if (!selectedDate || !selectedPractitioner || !selectedService) return []
    const dow = selectedDate.getDay()
    const av  = availability.find(a => a.day_of_week === dow)
    if (!av) return []

    const dur = selectedService.duration_minutes || 60
    const slots = []
    let [sh, sm] = av.start_time.slice(0, 5).split(':').map(Number)
    const [eh, em] = av.end_time.slice(0, 5).split(':').map(Number)
    const endMins  = eh * 60 + em

    while (sh * 60 + sm + dur <= endMins) {
      const label   = fmt12(`${String(sh).padStart(2,'0')}:${String(sm).padStart(2,'0')}`)
      const val     = `${String(sh).padStart(2,'0')}:${String(sm).padStart(2,'0')}`
      const dateStr = toDateStr(selectedDate)
      const conflict = existingBookings.some(b => {
        if (b.booking_date !== dateStr) return false
        const [bh, bm] = b.start_time.slice(0,5).split(':').map(Number)
        const bStart = bh * 60 + bm
        const bEnd   = b.end_time
          ? (() => { const [eh,em] = b.end_time.slice(0,5).split(':').map(Number); return eh*60+em })()
          : bStart + 60
        const sStart = sh * 60 + sm
        const sEnd   = sStart + dur
        return sStart < bEnd && sEnd > bStart
      })
      slots.push({ label, val, conflict })
      sm += 30
      if (sm >= 60) { sh += 1; sm -= 60 }
    }
    return slots
  }

  const handleConfirm = async () => {
    if (!selectedService || !selectedPractitioner || !selectedDate || !selectedTime) return
    setSubmitting(true)

    const ref = genRef()
    const dur = selectedService.duration_minutes || 60
    const [sh, sm] = selectedTime.split(':').map(Number)
    const endMins  = sh * 60 + sm + dur
    const endTime  = `${String(Math.floor(endMins/60)).padStart(2,'0')}:${String(endMins%60).padStart(2,'0')}:00`
    const clientName = user.user_metadata?.full_name || user.email.split('@')[0]

    const { error } = await supabase.from('bookings').insert({
      booking_ref:     ref,
      booking_date:    toDateStr(selectedDate),
      start_time:      selectedTime + ':00',
      end_time:        endTime,
      client_name:     clientName,
      client_email:    user.email,
      service_id:      selectedService.id,
      practitioner_id: selectedPractitioner.id,
      booking_type:    selectedService.category,
      amount_cents:    selectedService.price_cents || 0,
      status:          'pending',
      payment_status:  'unpaid',
      notes:           notes.trim() || null,
    })

    if (error) {
      showToast('Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }

    setBookingRef(ref)

    // Paid service → redirect to PayFast
    if (selectedService.price_cents > 0) {
      try {
        const res = await fetch('/api/payfast-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            booking_ref:  ref,
            amount_cents: selectedService.price_cents,
            service_name: selectedService.name,
            client_name:  clientName,
            client_email: user.email,
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        setPfUrl(json.payfast_url)
        setPfFields(json.fields)
        // useEffect will auto-submit the form
      } catch (err) {
        showToast('Payment redirect failed. Please contact us.')
        setSubmitting(false)
      }
    } else {
      // Free service → show confirmation
      setDone(true)
      setSubmitting(false)
    }
  }

  if (loading) return <div className="cp-loading"><div className="cp-spinner" /></div>

  // Redirecting to PayFast — show loading + hidden form
  if (pfFields) {
    return (
      <div className="cp-page cp-book-done">
        <div className="cp-spinner" style={{ width: 48, height: 48, margin: '0 auto 24px' }} />
        <h2 className="cp-done-title">Redirecting to Payment</h2>
        <p className="cp-done-sub">Taking you to PayFast's secure payment page…</p>
        <form ref={pfFormRef} method="POST" action={pfUrl} style={{ display: 'none' }}>
          {Object.entries(pfFields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </form>
      </div>
    )
  }

  // Free booking confirmed
  if (done) {
    return (
      <div className="cp-page cp-book-done">
        <div className="cp-done-icon">✓</div>
        <h2 className="cp-done-title">Booking Received</h2>
        <div className="cp-done-ref">{bookingRef}</div>
        <p className="cp-done-sub">
          We'll confirm your booking within 24 hours. You'll receive an email confirmation shortly.
        </p>
        <button className="cp-btn-primary" onClick={() => navigate('/bookings')}>View My Bookings</button>
      </div>
    )
  }

  const slots = getSlots()

  return (
    <div className="cp-page">
      <div className="cp-page-header">
        <h1 className="cp-page-title">Book a Session</h1>
      </div>

      {/* Step indicator */}
      <div className="cp-steps">
        {STEPS.map((s, i) => (
          <div key={s} className={`cp-step${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}>
            <div className="cp-step-dot">{i < step ? '✓' : i + 1}</div>
            <div className="cp-step-label">{s}</div>
          </div>
        ))}
      </div>

      {/* Step 0 — Service */}
      {step === 0 && (
        <div className="cp-book-step">
          {Object.entries(servicesByCategory).map(([cat, svcs]) => (
            <div key={cat} className="cp-service-group">
              <div className="cp-service-cat">
                {cat === 'class' ? 'Training' : cat === 'recovery' ? 'Recovery & Wellness' : 'Appointments'}
              </div>
              {svcs.map(s => (
                <button
                  key={s.id}
                  className={`cp-service-card${selectedService?.id === s.id ? ' selected' : ''}`}
                  onClick={() => { setSelectedService(s); setSelectedPractitioner(null); setSelectedDate(null); setSelectedTime(null) }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div className="cp-service-name">{s.name}</div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: 'var(--gold)', whiteSpace: 'nowrap' }}>
                      {s.price_cents > 0 ? fmtPrice(s.price_cents) : 'Free'}
                    </div>
                  </div>
                  {s.duration_minutes && <div className="cp-service-meta">{s.duration_minutes} min</div>}
                  {s.description && <div className="cp-service-desc">{s.description}</div>}
                </button>
              ))}
            </div>
          ))}
          <div className="cp-step-footer">
            <button className="cp-btn-primary" style={{ flex: 1 }} disabled={!selectedService} onClick={() => setStep(1)}>
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 1 — Practitioner */}
      {step === 1 && (
        <div className="cp-book-step">
          <div className="cp-pract-grid">
            {practitioners.map(p => (
              <button
                key={p.id}
                className={`cp-pract-card${selectedPractitioner?.id === p.id ? ' selected' : ''}`}
                onClick={() => { setSelectedPractitioner(p); setSelectedDate(null); setSelectedTime(null) }}
              >
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.name} className="cp-pract-photo" />
                ) : (
                  <div className="cp-pract-avatar" style={{ background: p.color || '#C9A84C' }}>
                    {p.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <div className="cp-pract-name">{p.name}</div>
                <div className="cp-pract-role">{p.role || '—'}</div>
              </button>
            ))}
          </div>
          <div className="cp-step-footer">
            <button className="cp-btn-secondary" onClick={() => setStep(0)}>← Back</button>
            <button className="cp-btn-primary" style={{ flex: 1 }} disabled={!selectedPractitioner} onClick={() => setStep(2)}>Next →</button>
          </div>
        </div>
      )}

      {/* Step 2 — Date & Time */}
      {step === 2 && (
        <div className="cp-book-step">
          {availableDates.length === 0 ? (
            <div className="cp-empty"><p>No available dates for this practitioner.</p></div>
          ) : (
            <>
              <div className="cp-book-sublabel">Select a date</div>
              <div className="cp-date-grid">
                {availableDates.map(d => (
                  <button
                    key={toDateStr(d)}
                    className={`cp-date-btn${selectedDate && toDateStr(selectedDate) === toDateStr(d) ? ' selected' : ''}`}
                    onClick={() => { setSelectedDate(d); setSelectedTime(null) }}
                  >
                    <span className="cp-date-day">{d.toLocaleDateString('en-ZA',{weekday:'short'})}</span>
                    <span className="cp-date-num">{d.getDate()}</span>
                    <span className="cp-date-mon">{d.toLocaleDateString('en-ZA',{month:'short'})}</span>
                  </button>
                ))}
              </div>

              {selectedDate && (
                <>
                  <div className="cp-book-sublabel" style={{ marginTop: 24 }}>Select a time</div>
                  {slots.length === 0 ? (
                    <div className="cp-empty"><p>No slots available on this day.</p></div>
                  ) : (
                    <div className="cp-time-grid">
                      {slots.map(s => (
                        <button
                          key={s.val}
                          className={`cp-time-btn${selectedTime === s.val ? ' selected' : ''}${s.conflict ? ' conflict' : ''}`}
                          onClick={() => !s.conflict && setSelectedTime(s.val)}
                          disabled={s.conflict}
                          title={s.conflict ? 'Already booked' : ''}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
          <div className="cp-step-footer">
            <button className="cp-btn-secondary" onClick={() => setStep(1)}>← Back</button>
            <button className="cp-btn-primary" style={{ flex: 1 }} disabled={!selectedDate || !selectedTime} onClick={() => setStep(3)}>Next →</button>
          </div>
        </div>
      )}

      {/* Step 3 — Confirm */}
      {step === 3 && (
        <div className="cp-book-step">
          <div className="cp-confirm-card">
            <div className="cp-confirm-row">
              <span className="cp-confirm-label">Service</span>
              <span>{selectedService?.name}</span>
            </div>
            <div className="cp-confirm-row">
              <span className="cp-confirm-label">With</span>
              <span>{selectedPractitioner?.name}</span>
            </div>
            <div className="cp-confirm-row">
              <span className="cp-confirm-label">Date</span>
              <span>{selectedDate?.toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span>
            </div>
            <div className="cp-confirm-row">
              <span className="cp-confirm-label">Time</span>
              <span>{fmt12(selectedTime)}</span>
            </div>
            <div className="cp-confirm-row">
              <span className="cp-confirm-label">Duration</span>
              <span>{selectedService?.duration_minutes || 60} min</span>
            </div>
            <div className="cp-confirm-row" style={{ background: 'rgba(201,168,76,.06)' }}>
              <span className="cp-confirm-label">Total</span>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: 'var(--gold)' }}>
                {selectedService?.price_cents > 0 ? fmtPrice(selectedService.price_cents) : 'Free'}
              </span>
            </div>
          </div>

          <div className="cp-field" style={{ marginTop: 16 }}>
            <label className="cp-field-label">Notes (optional)</label>
            <textarea
              className="cp-textarea"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any injuries, special requests or info for your practitioner…"
            />
          </div>

          {selectedService?.price_cents > 0 ? (
            <p className="cp-confirm-note">
              Clicking <strong>Pay Now</strong> will take you to PayFast's secure payment page. Your booking is held for 15 minutes.
            </p>
          ) : (
            <p className="cp-confirm-note">
              Your booking will be <strong>pending</strong> until confirmed by our team — usually within 24 hours.
            </p>
          )}

          <div className="cp-step-footer">
            <button className="cp-btn-secondary" onClick={() => setStep(2)}>← Back</button>
            <button className="cp-btn-primary" style={{ flex: 1 }} onClick={handleConfirm} disabled={submitting}>
              {submitting
                ? 'Processing…'
                : selectedService?.price_cents > 0
                  ? `Pay ${fmtPrice(selectedService.price_cents)}`
                  : 'Confirm Booking'}
            </button>
          </div>
        </div>
      )}

      {toast && <div className="cp-toast">{toast}</div>}
    </div>
  )
}
