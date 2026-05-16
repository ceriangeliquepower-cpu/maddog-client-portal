import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Profile() {
  const { user, signOut } = useAuth()
  const [member, setMember]   = useState(null)
  const [form, setForm]       = useState({ name: '', phone: '', emergency_contact: '', emergency_phone: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState('')

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data } = await supabase
        .from('members')
        .select('*')
        .eq('email', user.email)
        .maybeSingle()
      if (data) {
        setMember(data)
        setForm({
          name:              data.name              || '',
          phone:             data.phone             || '',
          emergency_contact: data.emergency_contact || '',
          emergency_phone:   data.emergency_phone   || '',
        })
      }
      setLoading(false)
    }
    load()
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    if (member) {
      await supabase.from('members').update(form).eq('email', user.email)
    }
    showToast('Profile updated.')
    setSaving(false)
  }

  if (loading) return <div className="cp-loading"><div className="cp-spinner" /></div>

  return (
    <div className="cp-page">
      <div className="cp-page-header">
        <h1 className="cp-page-title">My Profile</h1>
      </div>

      <div className="cp-profile-card">
        <div className="cp-profile-avatar">
          {(form.name || user?.email || '?').charAt(0).toUpperCase()}
        </div>
        <div className="cp-profile-email">{user?.email}</div>
        {member?.membership_status && (
          <div className="cp-membership-badge" style={{ margin: '8px auto 0' }}>
            {member.membership_status.replace(/_/g, ' ')}
          </div>
        )}
      </div>

      <div className="cp-section">
        <h2 className="cp-section-title">Personal Details</h2>
        <div className="cp-field">
          <label className="cp-field-label">Full Name</label>
          <input className="cp-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your full name" />
        </div>
        <div className="cp-field">
          <label className="cp-field-label">Phone Number</label>
          <input className="cp-input" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+27 ..." />
        </div>
      </div>

      <div className="cp-section">
        <h2 className="cp-section-title">Emergency Contact</h2>
        <div className="cp-field">
          <label className="cp-field-label">Contact Name</label>
          <input className="cp-input" value={form.emergency_contact} onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))} placeholder="Full name" />
        </div>
        <div className="cp-field">
          <label className="cp-field-label">Contact Phone</label>
          <input className="cp-input" type="tel" value={form.emergency_phone} onChange={e => setForm(f => ({ ...f, emergency_phone: e.target.value }))} placeholder="+27 ..." />
        </div>
      </div>

      <button className="cp-btn-primary" style={{ width: '100%', marginBottom: 12 }} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Changes'}
      </button>

      <button className="cp-btn-signout" onClick={signOut}>Sign Out</button>

      {toast && <div className="cp-toast">{toast}</div>}
    </div>
  )
}
