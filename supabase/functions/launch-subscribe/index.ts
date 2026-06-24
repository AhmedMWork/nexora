import { corsHeaders, json, rateLimit, serviceClient } from '../_shared/studio.ts';

function isEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function isPhone(value: string) { return /^\+?[0-9\s().-]{8,20}$/.test(value); }
function ok(data: Record<string, unknown> = {}) { return json({ ok: true, error: null, ...data, data }, 200); }
function fail(code: string, message: string, status = 400) { return json({ ok: false, data: null, error: { code, message, action: 'Try again or contact NEXORA on WhatsApp' } }, status); }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
  const limited = rateLimit(req, 'launch-subscribe', 10, 1000 * 60 * 10);
  if (limited) return limited;
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || '').trim().slice(0, 120);
    const contact = String(body.contact || '').trim().slice(0, 160);
    const source = String(body.source || 'opening_soon').trim().slice(0, 80);
    if (!contact) return fail('MISSING_CONTACT', 'Please enter your phone number or email.');
    if (!isEmail(contact) && !isPhone(contact)) return fail('INVALID_CONTACT', 'Please enter a valid phone number or email.');

    const supabase = serviceClient();
    const email = isEmail(contact) ? contact.toLowerCase() : null;
    const phone = !email ? contact : null;
    const { data, error } = await supabase.from('launch_subscribers').upsert({
      name,
      contact,
      email,
      phone,
      source,
      status: 'active',
      metadata: { userAgent: req.headers.get('user-agent') || null, lastSubmittedAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'contact' }).select('id').single();
    if (error) throw error;
    return ok({ id: data?.id });
  } catch (error) {
    return fail('LAUNCH_SUBSCRIBE_FAILED', error instanceof Error ? error.message : 'Could not save subscriber.', 500);
  }
});
