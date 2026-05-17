import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const STEPS = ['Category', 'Service', 'Practitioner', 'Date & Time', 'Confirm']

const CATEGORIES = [
  {
    id: 'mma',
    label: 'MMA & Combat Sports',
    sub: 'MMA · BJJ · Kickboxing · Boxing · Boxing Fitness',
    emoji: '🥊',
    gradient: 'linear-gradient(160deg, #1A0A0A 0%, #2D1010 100%)',
    dbCats: ['class', 'mma', 'bjj', 'kickboxing', 'boxing', 'boxing_fitness'],
    isTraining: true,
  },
  {
    id: 'pt',
    label: 'Personal Training',
    sub: '1-on-1 coaching sessions',
    emoji: '🏋️',
    gradient: 'linear-gradient(160deg, #0A1408 0%, #142010 100%)',
    dbCats: ['personal_training', 'pt'],
    isTraining: true,
  },
  {
    id: 'powerlifting',
    label: 'Powerlifting',
    sub: 'Squat · Bench · Deadlift',
    emoji: '🏆',
    gradient: 'linear-gradient(160deg, #100A08 0%, #1E1410 100%)',
    dbCats: ['powerlifting'],
    isTraining: true,
  },
  {
    id: 'physio',
    label: 'Physio',
    sub: 'Injury assessment & rehab',
    emoji: '🩺',
    gradient: 'linear-gradient(160deg, #080E1A 0%, #0D1628 100%)',
    dbCats: ['physio'],
    isTraining: false,
  },
  {
    id: 'assessment',
    label: 'Assessment',
    sub: 'Private consultations',
    emoji: '📋',
    gradient: 'linear-gradient(160deg, #10080A 0%, #1C0D12 100%)',
    dbCats: ['appointment', 'consultation', 'assessment'],
    isTraining: false,
  },
  {
    id: 'recovery',
    label: 'Recovery',
    sub: 'Sauna · Ice Bath · Contrast',
    emoji: '❄️',
    gradient: 'linear-gradient(160deg, #081018 0%, #0C1A24 100%)',
    dbCats: ['recovery', 'contrast', 'sauna', 'cold_plunge'],
    isTraining: false,
  },
  {
    id: 'wellness',
    label: 'Wellness & IV Therapy',
    sub: 'IV Drips · Slimming · Peptides',
    emoji: '💧',
    gradient: 'linear-gradient(160deg, #0A0818 0%, #150D28 100%)',
    dbCats: ['wellness', 'iv', 'iv_therapy', 'slimming', 'peptide'],
    isTraining: false,
  },
]

// Virtual trial service — not stored in DB, handled specially at booking time
const TRIAL_SERVICE = {
  id: '__trial__',
  name: 'Trial Class',
  category: 'trial',
  duration_minutes: 60,
  price_cents: 0,
  description: 'Your first session at Maddog — come meet the team, try the training, no commitment required.',
}

const TRAINING_MEMBERSHIP_TYPES = ['training', 'training_recovery']

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

  const [step, setStep]                         = useState(0)
  const [member, setMember]                     = useState(null)
  const [services, setServices]                 = useState([])
  const [practitioners, setPractitioners]       = useState([])
  const [availability, setAvailability]         = useState([])
  const [existingBookings, setExistingBookings] = useState([])
  const [linkedPractIds, setLinkedPractIds]     = useState(null) // null = show all

  const [selectedCategory,    setSelectedCategory]    = useState(null)
  const [selectedService,     setSelectedService]     = useState(null)
  const [selectedPractitioner,setSelectedPractitioner]= useState(null)
  const [selectedDate,        setSelectedDate]        = useState(null)
  const [selectedTime,        setSelectedTime]        = useState(null)
  const [notes,               setNotes]               = useState('')

  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [toast,      setToast]      = useState('')

  const [pfFields, setPfFields] = useState(null)
  const [pfUrl,    setPfUrl]    = useState('')
  const [done,     setDone]     = useState(false)
  const [bookingRef, setBookingRef] = useState('')

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  // Load member + services + practitioners on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [mRes, sRes, pRes] = await Promise.all([
        supabase.from('members').select('*').eq('email', user.email).maybeSingle(),
        supabase.from('services')
          .select('id, name, category, duration_minutes, price_cents, description')
          .eq('active', true).order('category').order('name'),
        supabase.from('practitioners')
          .select('id, name, role, color, photo_url')
          .eq('active', true).order('display_order'),
      ])
      setMember(mRes.data)
      setServices(sRes.data ?? [])
      setPractitioners(pRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [user])

  // When service selected → load which practitioners offer it
  useEffect(() => {
    if (!selectedService || selectedService.id === '__trial__') {
      setLinkedPractIds(null)
      return
    }
    const load = async () => {
      const { data } = await supabase
        .from('practitioner_services')
        .select('practitioner_id')
        .eq('service_id', selectedService.id)
      const ids = (data ?? []).map(r => r.practitioner_id)
      setLinkedPractIds(ids.length > 0 ? ids : null) // null = show all if none linked yet
    }
    load()
  }, [selectedService])

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

  // Membership status derived values
  const hasActiveMembership =
    member &&
    TRAINING_MEMBERSHIP_TYPES.includes(member.membership_type) &&
    member.membership_status === 'active'

  const isTrialMember = member?.membership_status === 'trial'

  // Services filtered to selected category
  const filteredServices = selectedCategory
    ? services.filter(s => selectedCategory.dbCats.includes(s.category?.toLowerCase()))
    : []

  // Practitioners filtered by linked service (or show all)
  const displayPractitioners = linkedPractIds
    ? practitioners.filter(p => linkedPractIds.includes(p.id))
    : practitioners

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

    const isTrial = selectedService.id === '__trial__'

    // Determine payment details based on membership
    let paymentStatus = 'unpaid'
    let amountCents   = selectedService.price_cents || 0
    let bookingType   = isTrial ? 'trial' : (selectedService.category || 'class')

    if (isTrial) {
      paymentStatus = 'free_trial'
      amountCents   = 0
    } else if (selectedCategory?.isTraining && hasActiveMembership) {
      paymentStatus = 'membership'
      amountCents   = 0
    }

    const { error } = await supabase.from('bookings').insert({
      booking_ref:     ref,
      booking_date:    toDateStr(selectedDate),
      start_time:      selectedTime + ':00',
      end_time:        endTime,
      client_name:     clientName,
      client_email:    user.email,
      service_id:      isTrial ? null : selectedService.id,
      practitioner_id: selectedPractitioner.id,
      booking_type:    bookingType,
      amount_cents:    amountCents,
      status:          'pending',
      payment_status:  paymentStatus,
      notes:           notes.trim() || null,
    })

    if (error) {
      showToast('Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }

    setBookingRef(ref)

    // Only go to PayFast if there's an actual amount to pay
    if (amountCents > 0) {
      try {
        const res = await fetch('/api/payfast-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            booking_ref:  ref,
            amount_cents: amountCents,
            service_name: selectedService.name,
            client_name:  clientName,
            client_email: user.email,
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        setPfUrl(json.payfast_url)
        setPfFields(json.fields)
      } catch (err) {
        showToast('Payment redirect failed. Please contact us.')
        setSubmitting(false)
      }
    } else {
      setDone(true)
      setSubmitting(false)
    }
  }

  if (loading) return <div className="cp-loading"><div className="cp-spinner" /></div>

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

  if (done) {
    return (
      <div className="cp-page cp-book-done">
        <div className="cp-done-icon">✓</div>
        <h2 className="cp-done-title">Booking Received</h2>
        <div className="cp-done-ref">{bookingRef}</div>
        <p className="cp-done-sub">
          {selectedService?.id === '__trial__'
            ? "Welcome to Maddog! We'll confirm your trial class within 24 hours."
            : "We'll confirm your booking within 24 hours. You'll receive a confirmation shortly."}
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

      {/* ── Step 0 — Category ── */}
      {step === 0 && (
        <div className="cp-book-step">
          <div className="cp-book-sublabel" style={{ marginBottom: 16 }}>What are you booking for?</div>
          <div className="cp-cat-grid">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`cp-cat-card${selectedCategory?.id === cat.id ? ' selected' : ''}`}
                onClick={() => { setSelectedCategory(cat); setSelectedService(null) }}
              >
                <div className="cp-cat-hero" style={{ background: cat.gradient }}>
                  <span className="cp-cat-emoji">{cat.emoji}</span>
                  <div className="cp-cat-name">{cat.label}</div>
                  <div className="cp-cat-sub">{cat.sub}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="cp-step-footer">
            <button
              className="cp-btn-primary"
              style={{ flex: 1 }}
              disabled={!selectedCategory}
              onClick={() => setStep(1)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 1 — Service ── */}
      {step === 1 && (
        <div className="cp-book-step">
          {selectedCategory && (
            <div className="cp-book-sublabel" style={{ marginBottom: 4 }}>
              {selectedCategory.emoji} {selectedCategory.label}
            </div>
          )}
          <div className="cp-book-sublabel" style={{ marginBottom: 16, opacity: .6, fontSize: 12 }}>
            Select a service
          </div>

          {/* Membership status banner — training categories only */}
          {selectedCategory?.isTraining && (
            <div className={`cp-membership-banner${hasActiveMembership ? ' active' : isTrialMember ? ' trial' : ' guest'}`}>
              {hasActiveMembership
                ? '✓ Your training membership covers these classes'
                : isTrialMember
                  ? '🎯 You have a trial class — book your first session below'
                  : '👋 Not a member yet? Book a free trial class to experience Maddog'}
            </div>
          )}

          {/* Trial class card — shown for non-active-members on training categories */}
          {selectedCategory?.isTraining && !hasActiveMembership && (
            <button
              className={`cp-service-card cp-trial-card${selectedService?.id === '__trial__' ? ' selected' : ''}`}
              onClick={() => setSelectedService(TRIAL_SERVICE)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="cp-service-name">🎯 Trial Class</div>
                <span className="cp-trial-badge">FREE</span>
              </div>
              <div className="cp-service-desc">
                Your first session at Maddog — come meet the team and experience the training. No commitment required.
              </div>
              <div className="cp-service-meta">60 min · First class</div>
            </button>
          )}

          {/* Regular services */}
          {selectedCategory?.isTraining && !hasActiveMembership ? (
            // Non-members: show regular services as "members only" reference
            filteredServices.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Member Classes
                </div>
                {filteredServices.map(s => (
                  <div key={s.id} className="cp-service-card cp-service-locked">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="cp-service-name" style={{ opacity: 0.5 }}>{s.name}</div>
                      <span className="cp-locked-badge">Members only</span>
                    </div>
                    {s.duration_minutes > 0 && (
                      <div className="cp-service-meta" style={{ opacity: 0.4 }}>{s.duration_minutes} min</div>
                    )}
                  </div>
                ))}
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 12, textAlign: 'center' }}>
                  Ready to join?{' '}
                  <a href="https://wa.me/27634421690" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>
                    Contact us on WhatsApp
                  </a>
                </p>
              </div>
            )
          ) : filteredServices.length === 0 ? (
            <div className="cp-empty">
              <p>No services available for this category yet.</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>Please contact us to book directly.</p>
            </div>
          ) : (
            filteredServices.map(s => (
              <button
                key={s.id}
                className={`cp-service-card${selectedService?.id === s.id ? ' selected' : ''}`}
                onClick={() => setSelectedService(s)}
              >
                <div className="cp-service-name">{s.name}</div>
                {s.duration_minutes > 0 && (
                  <div className="cp-service-meta">{s.duration_minutes} min</div>
                )}
                {s.description && <div className="cp-service-desc">{s.description}</div>}
                {selectedCategory?.isTraining && hasActiveMembership && (
                  <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, marginTop: 6 }}>
                    ✓ Covered by your membership
                  </div>
                )}
              </button>
            ))
          )}

          <div className="cp-step-footer">
            <button className="cp-btn-secondary" onClick={() => setStep(0)}>← Back</button>
            <button
              className="cp-btn-primary"
              style={{ flex: 1 }}
              disabled={!selectedService}
              onClick={() => setStep(2)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2 — Practitioner ── */}
      {step === 2 && (
        <div className="cp-book-step">
          <div className="cp-book-sublabel" style={{ marginBottom: 16 }}>
            {selectedCategory?.isTraining ? 'Choose your trainer' : 'Choose your practitioner'}
          </div>
          {displayPractitioners.length === 0 ? (
            <div className="cp-empty">
              <p>No staff available for this service yet.</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>Please contact us to book directly.</p>
            </div>
          ) : (
            <div className="cp-pract-grid">
              {displayPractitioners.map(p => (
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
          )}
          <div className="cp-step-footer">
            <button className="cp-btn-secondary" onClick={() => setStep(1)}>← Back</button>
            <button
              className="cp-btn-primary"
              style={{ flex: 1 }}
              disabled={!selectedPractitioner}
              onClick={() => setStep(3)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3 — Date & Time ── */}
      {step === 3 && (
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
            <button className="cp-btn-secondary" onClick={() => setStep(2)}>← Back</button>
            <button
              className="cp-btn-primary"
              style={{ flex: 1 }}
              disabled={!selectedDate || !selectedTime}
              onClick={() => setStep(4)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4 — Confirm ── */}
      {step === 4 && (
        <div className="cp-book-step">
          <div className="cp-confirm-card">
            <div className="cp-confirm-row">
              <span className="cp-confirm-label">Category</span>
              <span>{selectedCategory?.label}</span>
            </div>
            <div className="cp-confirm-row">
              <span className="cp-confirm-label">Session</span>
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
            {/* Only show payment row if there's actually a charge */}
            {selectedService?.price_cents > 0 && selectedService?.id !== '__trial__' && !hasActiveMembership && (
              <div className="cp-confirm-row" style={{ background: 'rgba(201,168,76,.06)' }}>
                <span className="cp-confirm-label">Total</span>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: 'var(--gold)' }}>
                  {fmtPrice(selectedService.price_cents)}
                </span>
              </div>
            )}
            {(selectedService?.id === '__trial__' || (selectedCategory?.isTraining && hasActiveMembership)) && (
              <div className="cp-confirm-row" style={{ background: 'rgba(45,158,95,.06)' }}>
                <span className="cp-confirm-label">Cost</span>
                <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: 14 }}>
                  {selectedService?.id === '__trial__' ? '✓ Free — trial class' : '✓ Covered by membership'}
                </span>
              </div>
            )}
          </div>

          <div className="cp-field" style={{ marginTop: 16 }}>
            <label className="cp-field-label">Notes (optional)</label>
            <textarea
              className="cp-textarea"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any injuries, special requests or info for your trainer…"
            />
          </div>

          {selectedService?.price_cents > 0 && !hasActiveMembership && selectedService?.id !== '__trial__' ? (
            <p className="cp-confirm-note">
              Clicking <strong>Pay Now</strong> will take you to PayFast's secure payment page.
            </p>
          ) : (
            <p className="cp-confirm-note">
              Your booking will be <strong>pending</strong> until confirmed by our team — usually within 24 hours.
            </p>
          )}

          <div className="cp-step-footer">
            <button className="cp-btn-secondary" onClick={() => setStep(3)}>← Back</button>
            <button className="cp-btn-primary" style={{ flex: 1 }} onClick={handleConfirm} disabled={submitting}>
              {submitting
                ? 'Processing…'
                : selectedService?.price_cents > 0 && !hasActiveMembership && selectedService?.id !== '__trial__'
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
