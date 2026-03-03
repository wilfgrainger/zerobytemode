// Simple in-memory rate limiter (resets on worker restart)
const rateLimitMap = new Map()
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX_MAGIC_LINK = 3 // max magic link requests per email per window
const RATE_LIMIT_MAX_TOKEN_VERIFY = 10 // max token verify attempts per IP per window

const checkRateLimit = (key, maxAttempts) => {
  const now = Date.now()
  const record = rateLimitMap.get(key)
  if (!record || now - record.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { start: now, count: 1 })
    return true
  }
  if (record.count >= maxAttempts) return false
  record.count++
  return true
}


// Top-level helpers
const getCachedSubscription = async (DB, email) => {
  if (!DB) return null
  const row = await DB.prepare('SELECT is_active FROM subscriptions WHERE email = ?')
    .bind(email)
    .first()
  if (row && typeof row.is_active !== 'undefined') return row.is_active === 1
  return null
}

const setCachedSubscription = async (DB, email, customerId, isActive) => {
  if (!DB) return
  await DB.prepare(
    'INSERT OR REPLACE INTO subscriptions (email, stripe_customer_id, is_active) VALUES (?, ?, ?)'
  )
    .bind(email, customerId || '', isActive ? 1 : 0)
    .run()
}

const getCustomerIdByEmail = async (env, email) => {
  const res = await fetch(
    `https://api.stripe.com/v1/customers?${new URLSearchParams({ email, limit: '1' })}`,
    { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } }
  )
  const data = await res.json()
  if (!res.ok) return null
  return data?.data?.[0]?.id || null
}

const createStripeCustomer = async (env, email) => {
  const res = await fetch('https://api.stripe.com/v1/customers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ email })
  })
  const data = await res.json()
  if (!res.ok) {
    console.error('Failed to create internal customer:', data)
    return null
  }
  return data.id
}

const isActiveSubscriptionForEmail = async (env, email) => {
  const cached = await getCachedSubscription(env.DB, email)
  if (cached !== null) return cached

  if (!env.STRIPE_SECRET_KEY) return false
  const customerId = await getCustomerIdByEmail(env, email)
  if (!customerId) return false
  const res = await fetch(
    `https://api.stripe.com/v1/subscriptions?${new URLSearchParams({
      customer: customerId,
      status: 'all',
      limit: '10'
    })}`,
    { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } }
  )
  const data = await res.json()
  if (!res.ok) return false
  const subs = Array.isArray(data?.data) ? data.data : []
  const isActive = subs.some((s) => s?.status === 'active' || s?.status === 'trialing')
  await setCachedSubscription(env.DB, email, customerId, isActive)
  return isActive
}

const hex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

const hmacHex = async (secret, message) => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return hex(sig)
}

const verifyStripeSignature = async (env, rawBody, signatureHeader, secret) => {
  const parts = String(signatureHeader || '').split(',').map((p) => p.trim())
  const tPart = parts.find((p) => p.startsWith('t='))
  const v1Parts = parts.filter((p) => p.startsWith('v1='))
  if (!tPart || v1Parts.length === 0) return { ok: false, error: 'Invalid signature header' }

  const timestamp = Number(tPart.slice(2))
  if (!Number.isFinite(timestamp)) return { ok: false, error: 'Invalid timestamp' }
  const toleranceSec = Number(env.STRIPE_WEBHOOK_TOLERANCE_SEC || 300)
  const nowSec = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSec - timestamp) > toleranceSec) {
    return { ok: false, error: 'Signature timestamp outside tolerance' }
  }

  const expected = await hmacHex(secret, `${timestamp}.${rawBody}`)
  const presented = v1Parts.map((p) => p.slice(3))
  const match = presented.some((v) => v === expected)
  return match ? { ok: true } : { ok: false, error: 'Signature mismatch' }
}

const createSessionToken = async (env, email) => {
  const secret = env.JWT_SECRET || env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error('Cannot create token: missing server secret');
  
  const timestamp = Date.now();
  const payload = `${email}|${timestamp}`;
  const signature = await hmacHex(secret, payload);
  const token = `${payload}|${signature}`;
  console.log('Created token for:', email, 'at', timestamp);
  return token;
}

const verifySessionToken = async (env, token) => {
  if (!token) {
    console.error('verifySessionToken: token is missing');
    return { email: null, error: 'Token is missing' };
  }
  const parts = token.split('|');
  if (parts.length !== 3) {
    console.error('verifySessionToken: invalid parts length', parts.length);
    return { email: null, error: `Invalid token format (parts: ${parts.length})` };
  }
  const [email, timestamp, signature] = parts;
  
  const secret = env.JWT_SECRET || env.STRIPE_SECRET_KEY;
  if (!secret) return { email: null, error: 'Server configuration error: missing secret' };
  
  const expectedSignature = await hmacHex(secret, `${email}|${timestamp}`);
  if (signature !== expectedSignature) {
    console.error('verifySessionToken: signature mismatch');
    return { email: null, error: 'Invalid cryptographic signature' };
  }
  
  // Expiration check (30 days)
  if (Date.now() - parseInt(timestamp, 10) > 30 * 24 * 60 * 60 * 1000) {
    console.error('verifySessionToken: token expired');
    return { email: null, error: 'Token has expired' };
  }
  
  return { email, error: null };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin')
    const allowedOrigins = [
      env.ALLOWED_ORIGIN,
      'https://zerobytemode.com',
      'https://www.zerobytemode.com',
      'http://localhost:3000'
    ]
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }

    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    const text = (body, status = 200) =>
      new Response(body, { status, headers: corsHeaders })

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    const url = new URL(request.url)

    // Auth Path: Magic Link Delivery
    if (url.pathname === '/auth/magic-link' && request.method === 'POST') {
      try {
        const { email, siteUrl } = await request.json()
        if (!email) return json({ error: 'Missing email' }, 400)
        
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        if (!isValidEmail) return json({ error: 'Invalid email' }, 400)

        // Rate limit magic link requests
        if (email !== 'wjgrainger@gmail.com' && !checkRateLimit(`magic:${email}`, RATE_LIMIT_MAX_MAGIC_LINK)) {
          return json({ error: 'Too many requests', detail: 'Rate limit exceeded. Please try again in 15 minutes.' }, 429)
        }

        let isActive = false;
        try {
          isActive = await isActiveSubscriptionForEmail(env, email)
        } catch (stripeErr) {
          console.error('Stripe Check Error:', stripeErr);
          return json({ error: 'Failed to verify subscription status', detail: stripeErr.message }, 500)
        }

        if (!isActive && String(env.REQUIRE_ACTIVE_SUBSCRIPTION_FOR_LOGIN || 'true') !== 'false') {
          return json({ error: 'No active subscription found' }, 403)
        }

        const token = crypto.randomUUID()
        const expiresAt = Date.now() + 15 * 60 * 1000
        
        try {
          await env.DB.prepare('INSERT OR REPLACE INTO login_tokens (email, token, expires_at) VALUES (?, ?, ?)')
            .bind(email, token, expiresAt).run()
        } catch (dbErr) {
          console.error('D1 Write Error:', dbErr);
          return json({ error: 'Failed to generate secure token', detail: dbErr.message }, 500)
        }

        const baseUrl = siteUrl || env.BASE_URL || 'http://localhost:3000'
        const magicLink = `${baseUrl.replace(/\/$/, '')}/verify?token=${encodeURIComponent(token)}`

        // Send via Resend
        const emailFrom = env.EMAIL_FROM ? `ZeroByteMode <${env.EMAIL_FROM}>` : 'ZeroByteMode <compress@zerobytemode.com>';
        if (env.RESEND_API_KEY) {
          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: emailFrom,
              to: [email],
              subject: 'Your ZeroByteMode Compression account',
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; color: #0f172a;">
                  <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Click to access your Studio account:</h2>
                  <p style="color: #64748b; font-size: 14px; margin-bottom: 28px;">This link expires in 15 minutes and can only be used once.</p>
                  <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED, #DB2777, #EA580C); color: white; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 10px; text-decoration: none;">Login to ZeroByteMode</a>
                  <p style="color: #94a3b8; font-size: 12px; margin-top: 28px;">If you didn't request this, you can safely ignore this email.</p>
                </div>
              `
            })
          })
          
          if (!resendResponse.ok) {
            const errorData = await resendResponse.text();
            console.error('Resend Error:', errorData);
            
            let userFriendlyError = 'Email delivery service failed';
            if (errorData.includes('not_verified') || errorData.includes('from_address')) {
              userFriendlyError = 'Email sender (EMAIL_FROM) is not verified in Resend.';
            } else if (errorData.includes('unauthorized') || errorData.includes('invalid_api_key')) {
              userFriendlyError = 'Invalid Resend API Key.';
            }

            return json({ 
              success: false,
              error: userFriendlyError, 
              detail: errorData,
              // DEBUG: Allow developer to see the link if email fails
              debugLink: email === 'wjgrainger@gmail.com' ? magicLink : null
            })
          }
          
          return json({ success: true })
        }
        
        return json({ success: true, debug: magicLink })
      } catch (err) {
        console.error('Magic Link Error:', err);
        return json({ error: 'Server error during magic link generation', detail: err.message }, 500)
      }
    }

    // Support Path: Send Issue Email
    if (url.pathname === '/support' && request.method === 'POST') {
      try {
        const { email, message } = await request.json()
        if (!email || !message) return json({ error: 'Missing email or message' }, 400)
        
        if (env.RESEND_API_KEY) {
          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'ZeroByteMode Support <compress@zerobytemode.com>', 
              to: ['contact-project+zerobytemode-zerobytemode-76853945-issue-@incoming.gitlab.com'],
              subject: `Support Request from ${email}`,
              text: `Message from user: ${email}\n\n${message}`,
              reply_to: email
            })
          })
          
          if (!resendResponse.ok) {
            const errorData = await resendResponse.text();
            console.error('Support Resend Error:', errorData);
            return json({ success: false, error: 'Failed to send support request' }, 500)
          }
          return json({ success: true })
        }
        
        return json({ success: false, error: 'Email service unconfigured' }, 500)
      } catch (err) {
        console.error('Support endpoint error:', err);
        return json({ error: 'Server error', detail: err.message }, 500)
      }
    }

    // Auth Path: Verification
    if (url.pathname === '/auth/verify' && request.method === 'GET') {
      const token = url.searchParams.get('token')
      if (!token) return json({ error: 'Missing token' }, 400)

      const row = await env.DB.prepare('SELECT email FROM login_tokens WHERE token = ? AND expires_at > ?')
        .bind(token, Date.now()).first()

      if (!row?.email) return json({ error: 'Invalid or expired token' }, 400)
      await env.DB.prepare('DELETE FROM login_tokens WHERE token = ?').bind(token).run()

      const isActive = await isActiveSubscriptionForEmail(env, row.email)
      const sessionToken = await createSessionToken(env, row.email)
      return json({ 
        success: true, 
        email: row.email, 

        tier: isActive ? 'pro' : 'standard',
        isActive,
        sessionToken
      })
    }

    // Stripe: Create Checkout Session
    if (url.pathname === '/stripe/create-checkout' && request.method === 'POST') {
      try {
        const { email } = await request.json()
        const priceId = env.STRIPE_PRICE_ID || 'price_1SeN5uFJz3rreuQPzCFO5SUx';
        const baseUrl = env.BASE_URL || 'https://www.zerobytemode.com';

        const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            'mode': 'subscription',
            'payment_method_types[]': 'card',
            'line_items[0][price]': priceId,
            'line_items[0][quantity]': '1',
            'customer_email': email || '',
            'success_url': `${baseUrl}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
            'cancel_url': `${baseUrl}/`
          })
        })

        const session = await res.json()
        if (!res.ok) {
          console.error('Stripe Error:', session);
          return json({ error: 'Stripe session creation failed', detail: session.error }, 500)
        }
        
        return json({ url: session.url })
      } catch (err) {
        return json({ error: 'Internal Server Error', detail: err.message }, 500)
      }
    }

    // Stripe: Verify Checkout Session and give a session token
    if (url.pathname === '/stripe/verify-session' && request.method === 'GET') {
      const sessionId = url.searchParams.get('session_id')
      if (!sessionId) return json({ error: 'Missing session_id' }, 400)

      try {
        const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
        })
        const session = await res.json()
        if (!res.ok) return json({ error: 'Invalid session' }, 400)

        // Only issue token if session is complete and email exists
        if (session.status === 'complete' || session.payment_status === 'paid') {
          const email = session.customer_details?.email || session.customer_email
          if (!email) return json({ error: 'No email in session' }, 400)

          const isActive = await isActiveSubscriptionForEmail(env, email)
          const sessionToken = await createSessionToken(env, email)
          return json({ 
            success: true, 
            email, 
            isActive,
            sessionToken
          })
        }
        return json({ error: 'Session not complete' }, 400)
      } catch (err) {
        return json({ error: 'Server error during session verification', detail: err.message }, 500)
      }
    }

    // Stripe webhook endpoint
    if (url.pathname === '/stripe-webhook' && request.method === 'POST') {
      const rawBody = await request.text()
      const signature = request.headers.get('stripe-signature') || request.headers.get('Stripe-Signature')
      const secret = env.STRIPE_WEBHOOK_SECRET
      
      const verified = await verifyStripeSignature(env, rawBody, signature, secret)
      if (!verified.ok) return text(verified.error || 'Invalid signature', 400)

      let event = JSON.parse(rawBody)
      const obj = event?.data?.object
      
      // Handle both Subscription updates and initial Checkout completion
      if (event.type === 'checkout.session.completed' || event.type.startsWith('customer.subscription')) {
        const email = obj.customer_details?.email || obj.customer_email || obj.email
        const customerId = obj.customer
        const status = obj.status || obj.subscription_details?.status
        const isActive = status === 'active' || status === 'trialing' || event.type === 'checkout.session.completed'
        
        if (email) {
          await setCachedSubscription(env.DB, email, customerId, isActive)

          // If we have a session token from when they started checkout (optional optimization)
          // For now, just ensure the cache is warm.
          
          // Send confirmation email on initial checkout completion
          if (event.type === 'checkout.session.completed' && env.RESEND_API_KEY) {
            const fromEmail = env.EMAIL_FROM ? `ZeroByteMode <${env.EMAIL_FROM}>` : 'ZeroByteMode <hello@zerobytemode.com>';
            try {
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  from: fromEmail,
                  to: [email],
                  subject: 'Welcome to ZeroByteMode Pro!',
                  html: `<p>Thank you for upgrading to ZeroByteMode Pro!</p><p>Your account is now active. You have full access to our professional WASM engines and secure batch processing tools.</p><p><a href="${env.BASE_URL || 'https://www.zerobytemode.com'}/auth/verify">Access your dashboard</a></p>`
                })
              });
            } catch (emailErr) {
              console.error('Failed to send welcome email:', emailErr);
            }
          }
        }
        return text('ok')
      }

      return text('ignored')
    }

    // Stripe: Create Customer Portal Session
    if (url.pathname === '/stripe/create-portal-session' && request.method === 'POST') {
      try {
        const authHeader = request.headers.get('Authorization') || request.headers.get('authorization')
        if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
          console.error('Portal: Missing or invalid Authorization header');
          return json({ error: 'Unauthorized', detail: 'Missing or invalid Bearer token' }, 401)
        }
        
        const token = authHeader.split(/bearer /i)[1]?.trim()
        const { email, error: verifyError } = await verifySessionToken(env, token)
        
        if (verifyError || !email) {
          console.error('Portal: Token verification failed:', verifyError);
          return json({ error: 'Unauthorized', detail: verifyError || 'Token verification failed' }, 401)
        }

        const { returnUrl } = await request.json()
        
        let customerId = await getCustomerIdByEmail(env, email)
        if (!customerId) {
          // If the user hasn't made a purchase yet, they won't have a Stripe customer.
          // Create one on the fly so they can still access the portal.
          customerId = await createStripeCustomer(env, email)
          if (!customerId) {
            return json({ error: 'Unable to initialize billing account for this email.' }, 500)
          }
        }

        const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            customer: customerId,
            return_url: returnUrl || env.BASE_URL || 'https://www.zerobytemode.com'
          })
        })

        const session = await res.json()
        if (!res.ok) {
          console.error('Stripe Portal Session Error:', session);
          return json({ 
            error: 'Stripe portal session creation failed', 
            detail: session.error || 'Check if STRIPE_SECRET_KEY is set in worker secrets.',
            stripeRaw: session 
          }, 500)
        }

        return json({ url: session.url })
      } catch (err) {
        console.error('Create Portal Session Error:', err);
        return json({ error: 'Internal Server Error', detail: err.message }, 500)
      }
    }

    return json({ error: 'Not found' }, 404)
  }
}
