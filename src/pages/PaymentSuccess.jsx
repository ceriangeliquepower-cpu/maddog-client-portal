import { useSearchParams, Link } from 'react-router-dom'

export default function PaymentSuccess() {
  const [params] = useSearchParams()
  const ref = params.get('ref')

  return (
    <div className="cp-page cp-book-done">
      <div className="cp-done-icon" style={{ background: 'rgba(76,201,122,.12)', borderColor: '#4CC97A', color: '#4CC97A' }}>
        ✓
      </div>
      <h2 className="cp-done-title">Payment Successful</h2>
      {ref && <div className="cp-done-ref">{ref}</div>}
      <p className="cp-done-sub">
        Your payment has been received and your booking is now <strong style={{ color: '#4CC97A' }}>confirmed</strong>.
        You'll receive an email confirmation shortly.
      </p>
      <Link to="/bookings" className="cp-btn-primary">View My Bookings</Link>
    </div>
  )
}
