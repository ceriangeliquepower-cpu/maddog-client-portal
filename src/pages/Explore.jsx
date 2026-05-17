import { useState, useEffect } from 'react'
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

const DISCIPLINES = [
  {
    id: 'mma',
    tag: 'Combat Sports',
    name: 'Mixed Martial Arts',
    emoji: '🥊',
    gradient: 'linear-gradient(160deg, #1A0A0A 0%, #2D1010 100%)',
    body: 'MMA at Maddog is built on a foundation of real technique, not ego. Whether you\'re a complete beginner or an experienced fighter, our structured MMA programme develops striking, grappling and cage-work skills in a disciplined, supportive environment. Our coaches have competed at the highest levels — they bring that experience to every session.',
    bullets: ['Structured beginner & advanced classes', 'Cage work, clinch & wrestling', 'Competition preparation available', 'World-class coaching staff'],
  },
  {
    id: 'bjj',
    tag: 'Grappling',
    name: 'Brazilian Jiu-Jitsu',
    emoji: '🤸',
    gradient: 'linear-gradient(160deg, #0A1010 0%, #102020 100%)',
    body: 'Brazilian Jiu-Jitsu is the art of using technique and leverage to overcome physical size and strength. Our BJJ programme covers both the gi and no-gi, with structured drilling, positional sparring and live rolling. Classes suit everyone from first-timers to seasoned grapplers preparing for competition.',
    bullets: ['Gi & No-Gi classes', 'Technique-first methodology', 'Open mat rolling sessions', 'Beginner-friendly entry'],
  },
  {
    id: 'kickboxing',
    tag: 'Striking',
    name: 'Kickboxing',
    emoji: '🦵',
    gradient: 'linear-gradient(160deg, #18100A 0%, #2A1A0A 100%)',
    body: 'Our kickboxing classes combine stand-up striking with sharp footwork, cardio conditioning and bag work. You\'ll develop punch combinations, kicks, knees and defensive movement in a high-energy class that\'s as much of a workout as it is a skill session. Suitable for anyone wanting to get fit and learn to strike correctly.',
    bullets: ['Punch, kick & knee combinations', 'Heavy bag & pad work', 'Cardio conditioning', 'All fitness levels welcome'],
  },
  {
    id: 'boxing',
    tag: 'Fitness & Skill',
    name: 'Boxing Fitness',
    emoji: '🥋',
    gradient: 'linear-gradient(160deg, #0A0A18 0%, #101028 100%)',
    body: 'Boxing Fitness bridges the gap between technical boxing and full-body conditioning. No prior experience needed. Sessions focus on correct punching form, footwork and defensive habits alongside circuits that push your endurance and build real functional strength. One of the most effective fitness classes you\'ll ever take.',
    bullets: ['Punch technique & combinations', 'Footwork & head movement', 'High-intensity conditioning', 'Suitable for total beginners'],
  },
  {
    id: 'powerlifting',
    tag: 'Strength Sport',
    name: 'Powerlifting',
    emoji: '🏆',
    gradient: 'linear-gradient(160deg, #0A100A 0%, #111A0A 100%)',
    body: "Maddog's Powerlifting programme is built around the three competition lifts: squat, bench press and deadlift. Coached by experienced strength athletes, the programme focuses on correct technique, progressive overload and meet preparation for those who want to compete — or simply get seriously strong.",
    bullets: ['Squat, bench & deadlift coaching', 'Beginner to competitive programming', 'Meet preparation available', 'Open to all strength levels'],
  },
]

const WELLNESS = [
  {
    id: 'contrast',
    tag: 'Recovery Suite',
    name: 'Contrast Therapy',
    emoji: '🌡️',
    gradient: 'linear-gradient(160deg, #081018 0%, #0C1A24 100%)',
    body: 'Hot-to-cold contrast therapy is one of the most powerful recovery tools available to athletes. Alternating between our infrared sauna and cold plunge pool dramatically accelerates muscle recovery, reduces inflammation and sharpens mental clarity. Used by elite athletes worldwide — now accessible in Ballito.',
    bullets: ['Infrared sauna session', 'Cold plunge (ice bath)', 'Hot/cold protocol guidance', 'Post-training & general sessions'],
    prices: ['Post-training: from R80', 'General use: from R270'],
  },
  {
    id: 'sauna',
    tag: 'Recovery Suite',
    name: 'Infrared Sauna',
    emoji: '🔥',
    gradient: 'linear-gradient(160deg, #180A08 0%, #281410 100%)',
    body: 'Our infrared sauna penetrates deeper than traditional saunas, heating the body from within. The result is enhanced circulation, improved detoxification, deep muscle relaxation and a profound sense of recovery. A standalone sauna session or the first half of a contrast therapy protocol.',
    bullets: ['Deep infrared heat', 'Muscle relaxation & detox', 'Improved circulation', 'Private sessions available'],
    prices: null,
  },
  {
    id: 'cold',
    tag: 'Recovery Suite',
    name: 'Cold Plunge',
    emoji: '❄️',
    gradient: 'linear-gradient(160deg, #081018 0%, #0D1A28 100%)',
    body: 'The cold plunge is a controlled exposure to cold water that triggers a full-body physiological response — reduced inflammation, a flood of endorphins and a noticeable mental reset. Regular cold exposure builds resilience, improves mood and speeds up recovery from hard training sessions.',
    bullets: ['Controlled cold exposure', 'Reduces inflammation', 'Mental clarity & mood boost', 'Pairs perfectly with sauna'],
    prices: null,
  },
]

const IV_DRIPS = [
  {
    id: 'iv',
    tag: 'IV Therapy',
    name: 'Wellness IV Drips',
    emoji: '💉',
    gradient: 'linear-gradient(160deg, #0A0818 0%, #150D28 100%)',
    body: 'Our IV therapy range delivers vitamins, minerals and hydration directly into the bloodstream — bypassing the digestive system for near-instant effect. Whether you\'re recovering from intense training, fighting illness, or looking for an energy reset, our medical team tailors each drip to your goals.',
    bullets: ['Myers Cocktail & Vitamin C drips', 'Athletic performance & recovery', 'Immune support formulas', 'Administered by qualified staff'],
    prices: ['IV Drips from R350'],
  },
  {
    id: 'slimming',
    tag: 'Body Transformation',
    name: 'Slimming & Aesthetics',
    emoji: '✦',
    gradient: 'linear-gradient(160deg, #10080A 0%, #1C0D18 100%)',
    body: 'Our medical slimming programme is designed around your body composition and health goals — not a one-size-fits-all approach. Combining aesthetic IV drips, nutritional guidance and targeted treatment protocols, we support sustainable fat loss alongside the strength and performance work you\'re already doing at Maddog.',
    bullets: ['Body composition assessment', 'Aesthetic & slimming drips', 'Personalised treatment plans', 'Progress tracking'],
    prices: ['Programmes from R500'],
  },
  {
    id: 'peptide',
    tag: 'Performance Medicine',
    name: 'Peptide Therapy',
    emoji: '🧬',
    gradient: 'linear-gradient(160deg, #0A100A 0%, #0D1A10 100%)',
    body: 'Peptide therapy represents the cutting edge of performance and recovery medicine. Specific peptides support muscle growth, fat metabolism, sleep quality and cellular repair at a biological level. All protocols are discussed and administered under medical supervision. Enquire directly for a consultation.',
    bullets: ['Administered under medical supervision', 'Performance & recovery protocols', 'Sleep & hormone optimisation', 'Private consultation required'],
    prices: ['Enquire for pricing'],
  },
]

function fmt12h(t) {
  if (!t) return 'Closed'
  const [h, m] = t.split(':')
  const hr = parseInt(h, 10)
  return `${hr % 12 || 12}:${m}${hr < 12 ? 'am' : 'pm'}`
}

function DisciplineCard({ card }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="cp-brochure-card">
      <div
        className="cp-brochure-hero"
        style={{ background: card.gradient }}
      >
        <span className="cp-brochure-emoji">{card.emoji}</span>
        <div>
          <div className="cp-brochure-tag">{card.tag}</div>
          <div className="cp-brochure-name">{card.name}</div>
        </div>
      </div>
      <div className="cp-brochure-body">
        <p className="cp-brochure-desc">{card.body}</p>
        {open && (
          <ul className="cp-brochure-list">
            {card.bullets.map(b => <li key={b}>{b}</li>)}
          </ul>
        )}
        {card.prices && (
          <div className="cp-brochure-prices">
            {card.prices.map(p => (
              <span key={p} className="cp-brochure-price-chip">{p}</span>
            ))}
          </div>
        )}
        <button
          className="cp-brochure-toggle"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
        >
          {open ? 'Show less ↑' : 'What\'s included ↓'}
        </button>
      </div>
    </div>
  )
}

export default function Explore() {
  const [deals, setDeals] = useState([])
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

      {/* ── Dark hero ── */}
      <div className="cp-explore-hero">
        <img
          src="/logo-icon.png"
          alt="Maddog Performance Institute"
          className="cp-explore-logo"
        />
        <div className="cp-explore-title">Explore</div>
        <div className="cp-explore-sub">Ballito's premier MMA gym &amp; wellness centre</div>
      </div>

      {/* ── Intro ── */}
      <div className="cp-section">
        <p className="cp-brochure-intro">
          Maddog Performance Institute is built for people who take their training seriously.
          From world-class combat sports coaching to cutting-edge recovery and wellness programmes,
          everything under one roof in Ballito — built to make you better.
        </p>
      </div>

      {/* ── Combat Sports ── */}
      <div className="cp-section">
        <div className="cp-section-tag">Training</div>
        <h2 className="cp-section-title">Combat Sports & Fitness</h2>
        <div className="cp-brochure-grid">
          {DISCIPLINES.map(d => <DisciplineCard key={d.id} card={d} />)}
        </div>
      </div>

      {/* ── Recovery Suite ── */}
      <div className="cp-section">
        <div className="cp-section-tag">Recovery</div>
        <h2 className="cp-section-title">Recovery Suite</h2>
        <div className="cp-brochure-grid">
          {WELLNESS.map(d => <DisciplineCard key={d.id} card={d} />)}
        </div>
      </div>

      {/* ── Wellness & IV ── */}
      <div className="cp-section">
        <div className="cp-section-tag">Wellness</div>
        <h2 className="cp-section-title">IV Therapy &amp; Performance Medicine</h2>
        <div className="cp-brochure-grid">
          {IV_DRIPS.map(d => <DisciplineCard key={d.id} card={d} />)}
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

      {/* ── Find Us ── */}
      <div className="cp-section">
        <h2 className="cp-section-title">Find Us</h2>
        <div className="cp-gym-card">
          <iframe
            className="cp-gym-map"
            title="Maddog Performance Institute location"
            src="https://maps.google.com/maps?q=22+Sandra+Road+Balvista+Centre+Ballito+KZN+South+Africa&t=&z=15&ie=UTF8&iwloc=&output=embed"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="cp-gym-body">
            <div className="cp-gym-name">Maddog Performance Institute</div>
            <div className="cp-gym-address">22 Sandra Road, Balvista Centre, Ballito</div>
            <div className="cp-gym-actions">
              <a
                href="https://maps.google.com/?q=22+Sandra+Road+Balvista+Centre+Ballito+KZN"
                target="_blank"
                rel="noopener noreferrer"
                className="cp-gym-action-btn maps"
                aria-label="Open in Google Maps"
              >
                📍 Directions
              </a>
              <a
                href="tel:+27634421690"
                className="cp-gym-action-btn call"
                aria-label="Call the gym"
              >
                📞 Call
              </a>
              <a
                href="https://wa.me/27634421690"
                target="_blank"
                rel="noopener noreferrer"
                className="cp-gym-action-btn wa"
                aria-label="WhatsApp the gym"
              >
                💬 WhatsApp
              </a>
            </div>
            <div style={{ marginTop: 12 }}>
              <a
                href="mailto:info@maddogperformance.co.za"
                style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}
                aria-label="Email the gym"
              >
                ✉ info@maddogperformance.co.za
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
