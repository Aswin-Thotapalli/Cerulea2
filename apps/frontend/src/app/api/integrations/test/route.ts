import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Category = 'Payments' | 'Auth' | 'Communication' | 'Storage' | 'Data' | 'Analytics' | 'Webhooks';

interface TestRequest {
  integrationId: string;
  category: Category;
  credentials: Record<string, string>;
}

export async function POST(req: NextRequest) {
  let body: TestRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  const { integrationId, category, credentials } = body;
  if (!integrationId || !category) {
    return NextResponse.json({ ok: false, error: 'Missing integrationId or category' }, { status: 400 });
  }

  try {
    const result = await testIntegration(integrationId, category, credentials ?? {});
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'Test failed' }, { status: 200 });
  }
}

async function testIntegration(
  id: string,
  category: Category,
  creds: Record<string, string>,
): Promise<{ ok: boolean; message?: string }> {
  // Webhooks — send a test POST to the configured URL
  if (category === 'Webhooks') {
    const url = creds.webhookUrl;
    if (!url || !url.startsWith('https://')) {
      return { ok: false, message: 'Webhook URL is missing or not HTTPS.' };
    }
    const payload = {
      source: 'cerulea',
      event: 'test',
      timestamp: new Date().toISOString(),
      message: 'Webhook test from Cerulea Studio',
    };
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Cerulea-Studio/1.0',
    };
    if (creds.signingSecret || creds.webhookSecret) {
      headers['X-Cerulea-Signature'] = 'test';
    }
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok || res.status === 204) {
      return { ok: true, message: `Webhook responded with ${res.status}` };
    }
    return { ok: false, message: `Webhook returned ${res.status}` };
  }

  // Stripe — call /v1/balance (requires a valid secret key)
  if (id === 'stripe') {
    const key = creds.secretKey;
    if (!key) return { ok: false, message: 'Secret key is required.' };
    const res = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { ok: true };
    if (res.status === 401) return { ok: false, message: 'Invalid Stripe key.' };
    return { ok: false, message: `Stripe API returned ${res.status}` };
  }

  // SendGrid — call /v3/user/profile
  if (id === 'sendgrid') {
    const key = creds.apiKey;
    if (!key) return { ok: false, message: 'API key is required.' };
    const res = await fetch('https://api.sendgrid.com/v3/user/profile', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { ok: true };
    return { ok: false, message: `SendGrid returned ${res.status}` };
  }

  // Twilio — call Accounts API with AccountSid + AuthToken
  if (id === 'twilio') {
    const sid = creds.accountSid;
    const token = creds.authToken;
    if (!sid || !token) return { ok: false, message: 'Account SID and Auth Token are required.' };
    const encoded = Buffer.from(`${sid}:${token}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: { Authorization: `Basic ${encoded}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { ok: true };
    if (res.status === 401) return { ok: false, message: 'Invalid Twilio credentials.' };
    return { ok: false, message: `Twilio API returned ${res.status}` };
  }

  // Mailchimp — verify API key format (key includes datacenter suffix)
  if (id === 'mailchimp') {
    const key = creds.apiKey;
    if (!key || !key.includes('-')) return { ok: false, message: 'Invalid Mailchimp API key format.' };
    const dc = key.split('-').pop();
    const res = await fetch(`https://${dc}.api.mailchimp.com/3.0/ping`, {
      headers: { Authorization: `apikey ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { ok: true };
    return { ok: false, message: `Mailchimp returned ${res.status}` };
  }

  // Resend — call /emails/me or ping endpoint
  if (id === 'resend') {
    const key = creds.apiKey;
    if (!key) return { ok: false, message: 'API key is required.' };
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { ok: true };
    if (res.status === 401) return { ok: false, message: 'Invalid Resend API key.' };
    return { ok: false, message: `Resend returned ${res.status}` };
  }

  // Pinata IPFS — test pinning service auth
  if (id === 'pinata') {
    const key = creds.apiKey;
    const secret = creds.secretKey;
    if (!key || !secret) return { ok: false, message: 'API key and secret are required.' };
    const res = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      headers: { pinata_api_key: key, pinata_secret_api_key: secret },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { ok: true };
    return { ok: false, message: `Pinata returned ${res.status}` };
  }

  // Fallback: validate that all provided credential values are non-empty
  const allFilled = Object.values(creds).every(v => v && v.trim().length > 0);
  if (!allFilled) return { ok: false, message: 'Please fill in all required fields.' };
  return { ok: true, message: 'Credentials look valid (format check passed).' };
}
