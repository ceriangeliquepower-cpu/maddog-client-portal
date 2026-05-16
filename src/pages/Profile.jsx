import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const TODAY = new Date().toISOString().slice(0, 10)

export default function Profile() {
  const { user, signOut } = useAuth()
  const [member,  setMember]  = useState(null)
  const [form,    setForm]    = useState({ name: '', phone: '', emergency_contact: '', emergency_phone: '' })
  const [stats,   setStats]   = useState({ total: 0, attended: 0, cancelled: 0, spent: 0 })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState('')

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [mRes, bRes] = await Promise.all([
        supabase.from('members').select('*').eq('email', user.email).maybeSingle(),
        supabase.from('bookings').select('status, price_paid').eq('client_email', user.email),
      ])

      if (mRes.data) {
        setMember(mRes.data)
        setForm({
          name:              mRes.data.name              || '',
          phone:             mRes.data.phone             || '',
          emergency_contact: mRes.data.emergency_contact || '',
          emergency_phone:   mRes.data.emergency_phone   || '',
        })
      }

      const bookings = bRes.data ?? []
      const attended  = bookings.filter(b => b.status === 'completed').length
      const cancelled = bookings.filter(b => b.status === 'cancelled').length
      const spent     = bookings
        .filter(b => b.status === 'completed' && b.price_paid)
        .reduce((sum, b) => sum + (b.price_paid || 0), 0)

      setStats({ total: bookings.length, attended, cancelled, spent })
      setLoading(false)
    }
    load()
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    if (member) {
      await supabase.from('members').update(form).eq('email', user.email)
    } else {
      await supabase.from('members').insert({ ...form, email: user.email })
    }
    showToast('Profile updated ✓')
    setSaving(false)
  }

  const initial = (form.name || user?.email || '?').charAt(0).toUpperCase()
  const displayName = form.name || user?.email?.split('@')[0] || 'Member'

  if (loading) return <div className="cp-loading"><div className="cp-spinner" /></div>

  return (
    <div className="cp-page">

      {/* ── Dark profile hero ── */}
      <div className="cp-profile-hero">
        <div className="cp-profile-avatar">{initial}</div>
        <div className="cp-profile-info">
          <div className="cp-profile-name">{displayName}</div>
          <div className="cp-profile-email">{user?.email}</div>
          {member?.membership_status && (
            <div className="cp-membership-badge" style={{ marginTop: 8 }}>
              {member.membership_status.replace(/_/g, ' ')}
            </div>
          )}
        </div>
      </div>

      {/* ── Streak card ── */}
      <div className="cp-streak-card">
        <div>
          <div className="cp-streak-title">🔥 Current streak</div>
          <div className="cp-streak-sub">Keep showing up!</div>
        </div>
        <div className="cp-streak-text">{stats.attended}</div>
      </div>

      {/* ── Activity grid ── */}
      <div className="cp-section">
        <h2 className="cp-section-title">My Stats</h2>
        <div className="cp-activity-grid">
          <div className="cp-activity-card">
            <div className="cp-activity-value">{stats.total}</div>
            <div className="cp-activity-label">Total bookings</div>
          </div>
          <div className="cp-activity-card">
            <div className="cp-activity-value green">{stats.attended}</div>
            <div className="cp-activity-label">Sessions attended</div>
          </div>
          <div className="cp-activity-card">
            <div className="cp-activity-value" style={{ color: 'var(--red)' }}>{stats.cancelled}</div>
            <div className="cp-activity-label">Cancelled</div>
          </div>
          <div className="cp-activity-card">
            <div className="cp-activity-value gold">
              {stats.spent > 0 ? `R${stats.spent.toLocaleString('en-ZA')}` : '—'}
            </div>
            <div className="cp-activity-label">Total spent</div>
          </div>
        </div>
      </div>

      {/* ── Personal details ── */}
      <div className="cp-section">
        <h2 className="cp-section-title">Personal Details</h2>
        <div className="cp-field">
          <label className="cp-field-label" htmlFor="p-name">Full Name</label>
          <input
            id="p-name"
            className="cp-input"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Your full name"
          />
        </div>
        <div className="cp-field">
          <label className="cp-field-label" htmlFor="p-phone">Phone Number</label>
          <input
            id="p-phone"
            className="cp-input"
            type="tel"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="+27 ..."
          />
        </div>
      </div>

      {/* ── Emergency contact ── */}
      <div className="cp-section">
        <h2 className="cp-section-title">Emergency Contact</h2>
        <div className="cp-field">
          <label className="cp-field-label" htmlFor="p-ec-name">Contact Name</label>
          <input
            id="p-ec-name"
            className="cp-input"
            value={form.emergency_contact}
            onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))}
            placeholder="Full name"
          />
        </div>
        <div className="cp-field">
          <label className="cp-field-label" htmlFor="p-ec-phone">Contact Phone</label>
          <input
            id="p-ec-phone"
            className="cp-input"
            type="tel"
            value={form.emergency_phone}
            onChange={e => setForm(f => ({ ...f, emergency_phone: e.target.value }))}
            placeholder="+27 ..."
          />
        </div>
      </div>

      <button
        className="cp-btn-primary"
        style={{ width: '100%', marginBottom: 12 }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>

      <button className="cp-btn-signout" onClick={signOut}>Sign Out</button>

      {toast && <div className="cp-toast">{toast}</div>}
    </div>
  )
}
