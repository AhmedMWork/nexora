import { corsHeaders, json, requireStudio, serviceClient } from '../_shared/studio.ts';

type LaunchSettings = Record<string, unknown>;

function readBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  if (typeof value === 'number') return value === 1;
  return fallback;
}

function defaultLaunchSettings(): LaunchSettings {
  return {
    enabled: false,
    launchAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    timezone: 'Africa/Cairo',
    autoOpen: true,
    title: 'NEXORA is Opening Soon',
    subtitle: 'A new premium shopping experience is almost here.',
    eyebrow: 'Premium launch experience',
    announcement: 'We are preparing new drops, smoother checkout, and a better shopping journey.',
    buttonText: 'Contact us on WhatsApp',
    whatsappMessage: 'Hello NEXORA, I would like to know more about the launch.',
    backgroundImage: '',
    showCountdown: true,
    showNotifyForm: true,
    showSocialLinks: true,
    allowAdminBypass: true,
    notifySuccessMessage: 'You are on the launch list. We will contact you when NEXORA opens.',
  };
}

function normalizeLaunchSettings(value: unknown): LaunchSettings {
  const base = defaultLaunchSettings();
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    ...base,
    ...raw,
    enabled: readBoolean(raw.enabled, Boolean(base.enabled)),
    launchAt: String(raw.launchAt || base.launchAt),
    timezone: String(raw.timezone || base.timezone),
    autoOpen: readBoolean(raw.autoOpen, Boolean(base.autoOpen)),
    title: String(raw.title || base.title),
    subtitle: String(raw.subtitle || base.subtitle),
    eyebrow: String(raw.eyebrow || base.eyebrow),
    announcement: String(raw.announcement || base.announcement),
    buttonText: String(raw.buttonText || base.buttonText),
    whatsappMessage: String(raw.whatsappMessage || base.whatsappMessage),
    backgroundImage: String(raw.backgroundImage || ''),
    showCountdown: readBoolean(raw.showCountdown, Boolean(base.showCountdown)),
    showNotifyForm: readBoolean(raw.showNotifyForm, Boolean(base.showNotifyForm)),
    showSocialLinks: readBoolean(raw.showSocialLinks, Boolean(base.showSocialLinks)),
    allowAdminBypass: readBoolean(raw.allowAdminBypass, Boolean(base.allowAdminBypass)),
    notifySuccessMessage: String(raw.notifySuccessMessage || base.notifySuccessMessage),
  };
}

function ok(data: Record<string, unknown> = {}) {
  return json({ ok: true, error: null, ...data, data }, 200);
}

function fail(code: string, message: string, status = 400, action = 'Open Store Readiness') {
  return json({ ok: false, data: null, error: { code, message, action } }, status);
}

async function ensureMainSettings(supabase: ReturnType<typeof serviceClient>) {
  const { data, error } = await supabase.from('site_settings').select('*').eq('id', 'main').maybeSingle();
  if (error) throw error;
  if (data) return data;
  const { data: inserted, error: insertError } = await supabase
    .from('site_settings')
    .insert({ id: 'main', brand_name: 'NEXORA', launch_settings: defaultLaunchSettings() })
    .select('*')
    .single();
  if (insertError) throw insertError;
  return inserted;
}

function settingsPatch(s: Record<string, unknown>) {
  const patch: Record<string, unknown> = {
    brand_name: s.storeName,
    logo: s.logo,
    favicon: s.favicon,
    shipping_fee: s.shippingFee,
    free_shipping_threshold: s.freeShippingThreshold,
    whatsapp_number: s.whatsappNumber,
    support_email: s.supportEmail,
    currency: s.currency,
    cod_enabled: s.codEnabled,
    maintenance_mode: s.maintenanceMode,
    default_language: s.defaultLanguage,
    default_theme: s.defaultTheme,
    social_links: s.socialLinks,
    payment_settings: s.paymentSettings,
    launch_settings: s.launchSettings ? normalizeLaunchSettings(s.launchSettings) : undefined,
    meta_pixel_enabled: s.metaPixelEnabled,
    meta_pixel_id: s.metaPixelId,
    return_policy_text: s.returnPolicyText,
    shipping_policy_text: s.shippingPolicyText,
    seo: s.seo,
    updated_at: new Date().toISOString(),
  };
  Object.keys(patch).forEach((key) => patch[key] === undefined && delete patch[key]);
  return patch;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const blocked = await requireStudio(req); if (blocked) return blocked;
  const supabase = serviceClient();
  const body = await req.json().catch(() => ({}));
  try {
    if (body.action === 'get' || body.action === 'launch-get') {
      const settings = await ensureMainSettings(supabase);
      return ok({ settings, launchSettings: normalizeLaunchSettings(settings.launch_settings) });
    }

    if (body.action === 'update') {
      await ensureMainSettings(supabase);
      const patch = settingsPatch(body.settings || {});
      const { data, error } = await supabase.from('site_settings').update(patch).eq('id', 'main').select('*').single();
      if (error) throw error;
      return ok({ settings: data, launchSettings: normalizeLaunchSettings(data.launch_settings) });
    }

    if (body.action === 'launch-update') {
      await ensureMainSettings(supabase);
      const launchSettings = normalizeLaunchSettings(body.launchSettings || body.settings?.launchSettings || {});
      const { data, error } = await supabase
        .from('site_settings')
        .update({ launch_settings: launchSettings, updated_at: new Date().toISOString() })
        .eq('id', 'main')
        .select('id, launch_settings, updated_at')
        .single();
      if (error) throw error;
      return ok({ launchSettings: normalizeLaunchSettings(data.launch_settings), updatedAt: data.updated_at });
    }

    if (body.action === 'launch-subscribers') {
      const { data, error } = await supabase.from('launch_subscribers').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return ok({ subscribers: data || [] });
    }

    if (body.action === 'launch-subscriber-update') {
      const id = String(body.id || '').trim();
      const status = String(body.status || '').trim();
      if (!id) return fail('MISSING_SUBSCRIBER_ID', 'Subscriber id is required.');
      if (!['active', 'contacted', 'archived', 'blocked'].includes(status)) return fail('INVALID_STATUS', 'Subscriber status is invalid.');
      const { error } = await supabase.from('launch_subscribers').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      return ok({ id, status });
    }

    if (body.action === 'storefront-get') {
      const { data, error } = await supabase.from('site_settings').select('home_collection_tiles').eq('id', 'main').maybeSingle();
      if (error) throw error;
      return ok({ homeCollectionTiles: data?.home_collection_tiles || [] });
    }

    if (body.action === 'storefront-update') {
      const tiles = Array.isArray(body.homeCollectionTiles) ? body.homeCollectionTiles.slice(0, 5) : [];
      const { error } = await supabase.from('site_settings').update({ home_collection_tiles: tiles, updated_at: new Date().toISOString() }).eq('id', 'main');
      if (error) throw error;
      return ok({ homeCollectionTiles: tiles });
    }

    if (body.action === 'audit-logs') { const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(300); if (error) throw error; return ok({ logs: data || [] }); }
    if (body.action === 'newsletter') { const { data, error } = await supabase.from('newsletter').select('*').order('subscribed_at', { ascending: false }); if (error) throw error; return ok({ subscribers: data || [] }); }
    if (body.action === 'contact-messages') { const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false }); if (error) throw error; return ok({ messages: data || [] }); }
    if (body.action === 'audit-log') { const { data, error } = await supabase.from('audit_logs').insert(body.log).select('id').single(); if (error) throw error; return ok({ id: data.id }); }

    return fail('UNKNOWN_ACTION', 'Unknown settings action.', 400);
  } catch (error) {
    return fail('STUDIO_SETTINGS_FAILED', error instanceof Error ? error.message : 'Studio settings request failed.', 500, 'Open Store Readiness');
  }
});
