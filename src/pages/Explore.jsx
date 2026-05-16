import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const HOURS = [
  { day: 'Monday',    open: '05:30', close: '20:00' },
  { day: 'Tuesday',   open: '05:30', close: '20:00' },
  { day: 'Wednesday', open: '05:30', close: '20:00' },
  { day: 'Thursday',  open: '05:30', close: '20:00' },
  { day: 'Friday',    open: '05:30', close: '18:00' },
  { day: 'Saturday',  open: '07:00', close: '13:00' },
  { day: 'Sunday',    open: null,    close: null     },
]

const CATEGORIES = [
  {
    id:    'training',
    tag:   'Combat Sports & Fitness',
    name:  'Training',
    desc:  'MMA, BJJ, Kickboxing, Boxing Fitness and more. Build discipline, skill and conditioning with world-class coaches.',
    emoji: '🥊',
    bg:    '#1A1008',
  },
  {
    id:    'recovery',
    tag:   'Recovery & Wellness',
    name:  'Recovery Suite',
    desc:  'IV therapy, contrast therapy (hot/cold), infrared sauna and cold plunge. Recover faster, perform better.',
    emoji: '💧',
    bg:    '#081018',
  },
  {
    id:    'slimming',
    tag:   'Body Transformation',
    name:  'Slimming & Aesthetics',
    desc:  'Medical slimming programmes and aesthetic IV drips tailored to your body composition goals.',
    emoji: '✦',
    bg:    '#10081A',
  },
]

function fmt12h(t) {
  if (!t) return 'Closed'
  const [h, m] = t.split(':')
  const hr = parseInt(h, 10)
  return `${hr % 12 || 12}:${m}${hr < 12 ? 'am' : 'pm'}`
}

export default function Explore() {
  const [deals,   setDeals]   = useState([])
  const todayName = DAY_NAMES[new Date().getDay()]

  useEffect(() => {
    supabase
      .from('deals')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => setDeals(data ?? []))
  }, [])

  return (
    <div className="cp-page">

      {/* ── Dark explore header ── */}
      <div className="cp-explore-hero">
        <img
          src="/logo-dark.png"
          alt="Maddog Performance Institute"
          className="cp-explore-logo"
        />
        <div className="cp-explore-title">Explore</div>
        <div className="cp-explore-sub">Ballito's premier MMA gym & wellness centre</div>
      </div>

      {/* ── Category cards ── */}
      <div className="cp-section">
        <h2 className="cp-section-title">What we offer</h2>
        <div className="cp-category-grid">
          {CATEGORIES.map(cat => (
            <Link key={cat.id} to="/book" className="cp-category-card">
              <div
                className="cp-category-photo-placeholder"
                style={{ background: cat.bg }}
              >
                <span style={{ fontSize: 56 }}>{cat.emoji}</span>
              </div>
              <div className="cp-category-body">
                <div className="cp-category-tag">{cat.tag}</div>
                <div className="cp-category-name">{cat.name}</div>
                <div className="cp-category-desc">{cat.desc}</div>
                <span className="cp-category-cta">Book now ›</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Deals ── */}
      {deals.length > 0 && (
        <div className="cp-section">
          <h2 className="cp-section-title">Current Deals</h2>
          {deals.map(deal => (
            <div key={deal.id} className="cp-deal-banner" style={{ marginBottom: 10 }}>
              <span className="cp-deal-icon">🔥</span>
              <div>
                <div className="cp-deal-label">Special offer</div>
                <div className="cp-deal-title">{deal.title}</div>
                {deal.subtitle && <div className="cp-deal-price">{deal.subtitle}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Gym location ── */}
      <div className="cp-section">
        <h2 className="cp-section-title">Find Us</h2>
        <div className="cp-gym-card">
          <iframe
            className="cp-gym-map"
            title="Maddog Performance Institute location"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3459.123456789!2d32.0668!3d-29.5383!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1ef70e9b00000001%3A0x0!2sMaddog+Performance+Institute%2C+Ballito!5e0!3m2!1sen!2sza!4v1600000000000!5m2!1sen!2sza"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="cp-gym-body">
            <div className="cp-gym-name">Maddog Performance Institute</div>
            <div className="cp-gym-address">Ballito, KwaZulu-Natal, South Africa</div>
            <div className="cp-gym-actions">
              <a
                href="https://maps.google.com/?q=Maddog+Performance+Institute+Ballito"
                target="_blank"
                rel="noopener noreferrer"
                className="cp-gym-action-btn maps"
                aria-label="Open in Google Maps"
              >
                📍 Directions
              </a>
              <a
                href="tel:+27000000000"
                className="cp-gym-action-btn call"
                aria-label="Call the gym"
              >
                📞 Call
              </a>
              <a
                href="https://wa.me/27000000000"
                target="_blank"
                rel="noopener noreferrer"
                className="cp-gym-action-btn wa"
                aria-label="WhatsApp the gym"
              >
                💬 WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Hours ── */}
      <div className="cp-section">
        <div className="cp-hours-card">
          <div className="cp-hours-header">
            <span>🕐</span> Opening Hours
          </div>
          {HOURS.map(({ day, open, close }) => (
            <div
              key={day}
              className={`cp-hours-row${day === todayName ? ' today' : ''}`}
            >
              <span className="cp-hours-day">
                {day} {day === todayName && '· Today'}
              </span>
              <span className="cp-hours-time">
                {open ? `${fmt12h(open)} – ${fmt12h(close)}` : 'Closed'}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
