// ── Maddog Client Portal ───────────────────────────────────────────────────
// PayFast ITN (Instant Payment Notification) handler
// PayFast POSTs here after every payment attempt
// POST /api/payfast-notify
// ──────────────────────────────────────────────────────────────────────────
import crypto from 'crypto'

const PASSPHRASE   = process.env.PAYFAST_PASSPHRASE || 'jt7NOE43FZPn'
const SANDBOX      = process.env.PAYFAST_SANDBOX !== 'false'
const SB_URL       = process.env.SUPABASE_URL       || 'https://mthjfihctiluqllpegnr.supabase.co'
const SB_KEY       = process.env.SUPABASE_SERVICE_KEY // service role key — set in Vercel env

function generateSignature(data, passphrase) {
  let str = ''
  for (const [key, val] of Object.entries(data)) {
    if (key !== 'signature' && val !== '' && val !== null && val !== undefined) {
      str += `${key}=${encodeURIComponent(String(val).trim()).replace(/%20/g, '+')}&`
    }
  }
  str = str.slice(0, -1)
  if (passphrase) {
    str += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`
  }
  return crypto.createHash('md5').update(str).digest('hex')
}

async function updateBooking(bookingRef, paymentStatus, pfPaymentId) {
  const key = SB_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_VjcQHDkyEWXohoVwpDxhMw_Tu6fZBO9'
  const res = await fetch(
    `${SB_URL}/rest/v1/bookings?booking_ref=eq.${encodeURIComponent(bookingRef)}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        payment_status: paymentStatus,
        status: paymentStatus === 'paid' ? 'confirmed' : 'pending',
        ...(pfPaymentId && { notes: `PayFast ref: ${pfPaymentId}` }),
      }),
    }
  )
  return res.ok
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const data = req.body

    // 1 — Verify signature
    const expectedSig = generateSignature(data, PASSPHRASE)
    if (data.signature !== expectedSig) {
      console.error('ITN signature mismatch', { received: data.signature, expected: expectedSig })
      return res.status(400).send('Invalid signature')
    }

    // 2 — Verify with PayFast server (skip in sandbox)
    if (!SANDBOX) {
      const pfValidation = await fetch('https://www.payfast.co.za/eng/query/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data).toString(),
      })
      const pfText = await pfValidation.text()
      if (pfText !== 'VALID') {
        console.error('PayFast validation failed:', pfText)
        return res.status(400).send('PayFast validation failed')
      }
    }

    // 3 — Handle payment status
    const bookingRef   = data.m_payment_id
    const pfPaymentId  = data.pf_payment_id
    const paymentStatus = data.payment_status

    if (!bookingRef) {
      return res.status(400).send('Missing booking ref')
    }

    if (paymentStatus === 'COMPLETE') {
      await updateBooking(bookingRef, 'paid', pfPaymentId)
      console.log(`Payment complete: ${bookingRef}`)
    } else if (paymentStatus === 'CANCELLED') {
      await updateBooking(bookingRef, 'unpaid', pfPaymentId)
      console.log(`Payment cancelled: ${bookingRef}`)
    } else if (paymentStatus === 'FAILED') {
      await updateBooking(bookingRef, 'unpaid', pfPaymentId)
      console.log(`Payment failed: ${bookingRef}`)
    }

    return res.status(200).send('OK')
  } catch (err) {
    console.error('ITN handler error:', err)
    return res.status(500).send('Server error')
  }
}
