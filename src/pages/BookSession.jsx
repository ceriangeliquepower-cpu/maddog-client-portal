import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const STEPS = ['Service', 'Practitioner', 'Date & Time', 'Confirm']

function genRef() {
  return 'MDB-' + Math.random().toString(36).slice(2, 7).toUpperCase()
}

function nextDates(count = 14) {
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

export default function BookSession() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep]             = useState(0)
  const [services, setServices]     = useState([])
  const [practitioners, setPractitioners] = useState([])
  const [availability, setAvailability]   = useState([])
  const [bookings, setBookings]     = useState([])

  const [selectedService, setSelectedService]         = useState(null)
  const [selectedPractitioner, setSelectedPractitioner] = useState(null)
  const [selectedDate, setSelectedDate]               = useState(null)
  const [selectedTime, setSelectedTime]               = useState(null)
  const [notes, setNotes]                             = useState('')

  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast]       = useState('')
  const [done, setDone]         = useState(false)
  const [bookingRef, setBookingRef] = useState('')

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [sRes, pRes] = await Promise.all([
        supabase.from('services').select('id, name, category, duration_minutes, description').eq('active', true).order('category').order('name'),
        supabase.from('practitioners').select('id, name, role, color, photo_url').eq('active', true).order('display_order'),
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
      setBookings(bkRes.data ?? [])
    }
    load()
  }, [selectedPractitioner])

  const servicesByCategory = services.reduce((acc, s) => {
    ;(acc[s.category] ??= []).push(s)
    return acc
  }, {})

  // Practitioners who offer the selected service
  const eligiblePractitioners = selectedService
    ? practitioners // in a full build, filter by practitioner_services join
    : practitioners

  // Dates the practitioner is available
  const availableDates = nextDates(21).filter(d => {
    const dow = d.getDay() // 0=Sun
    return availability.some(a => a.day_of_week === dow && a.active !== false)
  })

  // Time slots for selected date
  const getSlots = () => {
    if (!selectedDate || !selectedPractitioner || !selectedService) return []
    const dow = selectedDate.getDay()
    const av  = availability.find(a => a.day_of_week === dow)
    if (!av) return []

    const dur    = selectedService.duration_minutes || 60
    const slots  = []
    let [sh, sm] = av.start_time.slice(0, 5).split(':').map(Number)
    const [eh, em] = av.end_time.slice(0, 5).split(':').map(Number)
    const endMins  = eh * 60 + em

    while (sh * 60 + sm + dur <= endMins) {
      const label = `${sh % 12 || 12}:${String(sm).padStart(2,'0')} ${sh < 12 ? 'am' : 'pm'}`
      const val   = `${String(sh).padStart(2,'0')}:${String(sm).padStart(2,'0')}`
      // Check conflict with existing bookings
      const dateStr = toDateStr(selectedDate)
      const conflict = bookings.some(b => {
        if (b.booking_date !== dateStr) return false
        const [bh, bm] = b.start_time.slice(0,5).split(':').map(Number)
        const bStart = bh * 60 + bm
        const bEnd   = b.end_time ? (() => { const [eh,em] = b.end_time.slice(0,5).split(':').map(Number); return eh*60+em })() : bStart + 60
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

    const { error } = await supabase.from('bookings').insert({
      booking_ref:      ref,
      booking_date:     toDateStr(selectedDate),
      start_time:       selectedTime + ':00',
      end_time:         endTime,
      client_name:      user.user_metadata?.full_name || user.email.split('@')[0],
      client_email:     user.email,
      service_id:       selectedService.id,
      practitioner_id:  selectedPractitioner.id,
      booking_type:     selectedService.category,
      status:           'pending',
      payment_status:   'unpaid',
      notes:            notes.trim() || null,
    })

    if (error) {
      showToast('Something went wrong. Please try again.')
    } else {
      setBookingRef(ref)
      setDone(true)
    }
    setSubmitting(false)
  }

  if (loading) return <div className="cp-loading"><div className="cp-spinner" /></div>

  if (done) return (
    <div className="cp-page cp-book-done">
      <div className="cp-done-icon">✓</div>
      <h2 className="cp-done-title">Booking Received</h2>
      <div className="cp-done-ref">{bookingRef}</div>
      <p className="cp-done-sub">We'll confirm your booking within 24 hours. You'll receive an email confirmation shortly.</p>
      <button className="cp-btn-primary" onClick={() => navigate('/bookings')}>View My Bookings</button>
    </div>
  )

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
              <div className="cp-service-cat">{cat.charAt(0).toUpperCase() + cat.slice(1)}</div>
              {svcs.map(s => (
                <button
                  key={s.id}
                  className={`cp-service-card${selectedService?.id === s.id ? ' selected' : ''}`}
                  onClick={() => { setSelectedService(s); setSelectedPractitioner(null); setSelectedDate(null); setSelectedTime(null) }}
                >
                  <div className="cp-service-name">{s.name}</div>
                  {s.duration_minutes && <div className="cp-service-meta">{s.duration_minutes} min</div>}
                  {s.description && <div className="cp-service-desc">{s.description}</div>}
                </button>
              ))}
            </div>
          ))}
          <div className="cp-step-footer">
            <button className="cp-btn-primary" disabled={!selectedService} onClick={() => setStep(1)}>
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 1 — Practitioner */}
      {step === 1 && (
        <div className="cp-book-step">
          <div className="cp-pract-grid">
            {eligiblePractitioners.map(p => (
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
            <button className="cp-btn-primary" disabled={!selectedPractitioner} onClick={() => setStep(2)}>Next →</button>
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
            <button className="cp-btn-primary" disabled={!selectedDate || !selectedTime} onClick={() => setStep(3)}>Next →</button>
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
              <span>
                {(() => { const [h,m]=selectedTime.split(':'); const hr=parseInt(h); return `${hr%12||12}:${m} ${hr<12?'am':'pm'}` })()}
              </span>
            </div>
            <div className="cp-confirm-row">
              <span className="cp-confirm-label">Duration</span>
              <span>{selectedService?.duration_minutes || 60} min</span>
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

          <p className="cp-confirm-note">
            Your booking will be <strong>pending</strong> until confirmed by our team — usually within 24 hours.
          </p>

          <div className="cp-step-footer">
            <button className="cp-btn-secondary" onClick={() => setStep(2)}>← Back</button>
            <button className="cp-btn-primary" onClick={handleConfirm} disabled={submitting}>
              {submitting ? 'Confirming…' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      )}

      {toast && <div className="cp-toast">{toast}</div>}
    </div>
  )
}
