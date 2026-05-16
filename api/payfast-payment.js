// ── Maddog Client Portal ───────────────────────────────────────────────────
// Generates a signed PayFast payment payload
// POST /api/payfast-payment
// ──────────────────────────────────────────────────────────────────────────
import crypto from 'crypto'

const MERCHANT_ID  = process.env.PAYFAST_MERCHANT_ID  || '10000100'
const MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY || '46f0cd694581a'
const PASSPHRASE   = process.env.PAYFAST_PASSPHRASE   || 'jt7NOE43FZPn'
const SANDBOX      = process.env.PAYFAST_SANDBOX !== 'false' // default: sandbox mode
const PAYFAST_URL  = SANDBOX
  ? 'https://sandbox.payfast.co.za/eng/process'
  : 'https://www.payfast.co.za/eng/process'

const BASE_URL = 'https://maddog-client-portal.vercel.app'

function generateSignature(data, passphrase) {
  let str = ''
  for (const [key, val] of Object.entries(data)) {
    if (val !== '' && val !== null && val !== undefined) {
      str += `${key}=${encodeURIComponent(String(val).trim()).replace(/%20/g, '+')}&`
    }
  }
  str = str.slice(0, -1) // remove trailing &
  if (passphrase) {
    str += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`
  }
  return crypto.createHash('md5').update(str).digest('hex')
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { booking_ref, amount_cents, service_name, client_name, client_email } = req.body

  if (!booking_ref || !amount_cents || amount_cents <= 0) {
    return res.status(400).json({ error: 'Missing required payment data' })
  }

  const nameParts = (client_name || '').trim().split(' ')
  const firstName = nameParts[0] || 'Client'
  const lastName  = nameParts.slice(1).join(' ') || '-'

  const data = {
    merchant_id:      MERCHANT_ID,
    merchant_key:     MERCHANT_KEY,
    return_url:       `${BASE_URL}/payment-success?ref=${booking_ref}`,
    cancel_url:       `${BASE_URL}/payment-cancel?ref=${booking_ref}`,
    notify_url:       `${BASE_URL}/api/payfast-notify`,
    name_first:       firstName,
    name_last:        lastName,
    email_address:    client_email,
    m_payment_id:     booking_ref,
    amount:           (amount_cents / 100).toFixed(2),
    item_name:        `Maddog: ${service_name}`,
    item_description: `Booking ref: ${booking_ref}`,
  }

  const signature = generateSignature(data, PASSPHRASE)

  return res.status(200).json({
    payfast_url: PAYFAST_URL,
    fields: { ...data, signature },
    sandbox: SANDBOX,
  })
}
