import { useSearchParams, Link } from 'react-router-dom'

export default function PaymentCancel() {
  const [params] = useSearchParams()
  const ref = params.get('ref')

  return (
    <div className="cp-page cp-book-done">
      <div className="cp-done-icon" style={{ background: 'rgba(201,76,76,.12)', borderColor: '#C94C4C', color: '#C94C4C' }}>
        ✕
      </div>
      <h2 className="cp-done-title">Payment Cancelled</h2>
      {ref && <div className="cp-done-ref" style={{ color: 'var(--white-dim)', fontSize: 18 }}>{ref}</div>}
      <p className="cp-done-sub">
        Your payment was cancelled. Your booking is still saved but won't be confirmed until payment is completed.
        You can try again from your bookings.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
        <Link to="/bookings" className="cp-btn-primary">View My Bookings</Link>
        <Link to="/book" className="cp-btn-secondary" style={{ textAlign: 'center' }}>Try Again</Link>
      </div>
    </div>
  )
}
