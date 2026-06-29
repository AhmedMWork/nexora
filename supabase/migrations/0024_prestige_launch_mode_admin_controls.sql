-- NEXORA Prestige Upgrade: Launch Mode, Opening Soon countdown, and launch subscribers.
-- Safe additive migration. It supports older production schemas and never removes existing data.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Site settings + Launch Mode JSON
-- ------------------------------------------------------------

create table if not exists public.site_settings (
  id text primary key,
  brand_name text default 'NEXORA',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.site_settings
  add column if not exists brand_name text default 'NEXORA',
  add column if not exists launch_settings jsonb,
  add column if not exists updated_at timestamptz default now();

insert into public.site_settings (id, brand_name, launch_settings)
values (
  'main',
  'NEXORA',
  jsonb_build_object(
    'enabled', false,
    'launchAt', (now() + interval '7 days')::text,
    'timezone', 'Africa/Cairo',
    'autoOpen', true,
    'title', 'NEXORA is Opening Soon',
    'subtitle', 'A new premium shopping experience is almost here.',
    'eyebrow', 'Premium launch experience',
    'announcement', 'We are preparing new drops, smoother checkout, and a better shopping journey.',
    'buttonText', 'Contact us on WhatsApp',
    'whatsappMessage', 'Hello NEXORA, I would like to know more about the launch.',
    'backgroundImage', '',
    'showCountdown', true,
    'showNotifyForm', true,
    'showSocialLinks', true,
    'allowAdminBypass', true,
    'notifySuccessMessage', 'You are on the launch list. We will contact you when NEXORA opens.'
  )
)
on conflict (id) do nothing;

update public.site_settings
set
  brand_name = coalesce(brand_name, 'NEXORA'),
  launch_settings = jsonb_build_object(
    'enabled', false,
    'launchAt', (now() + interval '7 days')::text,
    'timezone', 'Africa/Cairo',
    'autoOpen', true,
    'title', 'NEXORA is Opening Soon',
    'subtitle', 'A new premium shopping experience is almost here.',
    'eyebrow', 'Premium launch experience',
    'announcement', 'We are preparing new drops, smoother checkout, and a better shopping journey.',
    'buttonText', 'Contact us on WhatsApp',
    'whatsappMessage', 'Hello NEXORA, I would like to know more about the launch.',
    'backgroundImage', '',
    'showCountdown', true,
    'showNotifyForm', true,
    'showSocialLinks', true,
    'allowAdminBypass', true,
    'notifySuccessMessage', 'You are on the launch list. We will contact you when NEXORA opens.'
  ) || coalesce(launch_settings, '{}'::jsonb),
  updated_at = coalesce(updated_at, now())
where id = 'main';

update public.site_settings
set launch_settings = launch_settings || jsonb_build_object(
  'enabled', case when lower(coalesce(launch_settings->>'enabled', 'false')) in ('true','1','yes','on') then true else false end,
  'autoOpen', case when lower(coalesce(launch_settings->>'autoOpen', 'true')) in ('false','0','no','off') then false else true end,
  'showCountdown', case when lower(coalesce(launch_settings->>'showCountdown', 'true')) in ('false','0','no','off') then false else true end,
  'showNotifyForm', case when lower(coalesce(launch_settings->>'showNotifyForm', 'true')) in ('false','0','no','off') then false else true end,
  'showSocialLinks', case when lower(coalesce(launch_settings->>'showSocialLinks', 'true')) in ('false','0','no','off') then false else true end,
  'allowAdminBypass', case when lower(coalesce(launch_settings->>'allowAdminBypass', 'true')) in ('false','0','no','off') then false else true end
)
where id = 'main';

alter table public.site_settings alter column launch_settings set default jsonb_build_object(
  'enabled', false,
  'launchAt', (now() + interval '7 days')::text,
  'timezone', 'Africa/Cairo',
  'autoOpen', true,
  'title', 'NEXORA is Opening Soon',
  'subtitle', 'A new premium shopping experience is almost here.',
  'eyebrow', 'Premium launch experience',
  'announcement', 'We are preparing new drops, smoother checkout, and a better shopping journey.',
  'buttonText', 'Contact us on WhatsApp',
  'whatsappMessage', 'Hello NEXORA, I would like to know more about the launch.',
  'backgroundImage', '',
  'showCountdown', true,
  'showNotifyForm', true,
  'showSocialLinks', true,
  'allowAdminBypass', true,
  'notifySuccessMessage', 'You are on the launch list. We will contact you when NEXORA opens.'
);

alter table public.site_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'site_settings' and policyname = 'Public can read settings'
  ) then
    create policy "Public can read settings" on public.site_settings for select using (id = 'main');
  end if;
end $$;

-- ------------------------------------------------------------
-- Launch subscribers
-- ------------------------------------------------------------

create table if not exists public.launch_subscribers (
  id uuid primary key default gen_random_uuid(),
  name text,
  contact text,
  email text,
  phone text,
  source text default 'opening_soon',
  status text default 'active',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.launch_subscribers
  add column if not exists name text,
  add column if not exists contact text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists source text default 'opening_soon',
  add column if not exists status text default 'active',
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.launch_subscribers
set
  source = coalesce(source, 'opening_soon'),
  status = coalesce(status, 'active'),
  metadata = coalesce(metadata, '{}'::jsonb),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where source is null or status is null or metadata is null or created_at is null or updated_at is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'launch_subscribers_status_check' and conrelid = 'public.launch_subscribers'::regclass
  ) then
    alter table public.launch_subscribers add constraint launch_subscribers_status_check check (status in ('active','contacted','archived','blocked'));
  end if;
end $$;

create unique index if not exists launch_subscribers_contact_key on public.launch_subscribers(contact) where contact is not null;
create index if not exists idx_launch_subscribers_created_at on public.launch_subscribers(created_at desc);
create index if not exists idx_launch_subscribers_status on public.launch_subscribers(status);

alter table public.launch_subscribers enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'launch_subscribers' and policyname = 'Launch subscribers are inserted through edge functions only'
  ) then
    create policy "Launch subscribers are inserted through edge functions only"
      on public.launch_subscribers for insert with check (false);
  end if;
end $$;

-- ------------------------------------------------------------
-- Admin notifications with legacy column support
-- ------------------------------------------------------------

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  notification_type text default 'system',
  type text default 'system',
  title text default 'Notification',
  body text,
  message text,
  severity text default 'info',
  action_url text,
  target_url text,
  is_read boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.admin_notifications
  add column if not exists notification_type text default 'system',
  add column if not exists type text default 'system',
  add column if not exists title text default 'Notification',
  add column if not exists body text,
  add column if not exists message text,
  add column if not exists severity text default 'info',
  add column if not exists action_url text,
  add column if not exists target_url text,
  add column if not exists is_read boolean default false,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.admin_notifications
set
  notification_type = coalesce(notification_type, type, 'system'),
  type = coalesce(type, notification_type, 'system'),
  title = coalesce(title, 'Notification'),
  body = coalesce(body, message),
  message = coalesce(message, body),
  severity = coalesce(severity, 'info'),
  action_url = coalesce(action_url, target_url),
  target_url = coalesce(target_url, action_url),
  is_read = coalesce(is_read, false),
  metadata = coalesce(metadata, '{}'::jsonb),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where notification_type is null or type is null or title is null or severity is null or is_read is null or metadata is null or created_at is null or updated_at is null or action_url is null or target_url is null;

alter table public.admin_notifications
  alter column notification_type set default 'system',
  alter column type set default 'system',
  alter column title set default 'Notification',
  alter column severity set default 'info',
  alter column is_read set default false,
  alter column metadata set default '{}'::jsonb,
  alter column created_at set default now(),
  alter column updated_at set default now();

do $$
begin
  begin alter table public.admin_notifications alter column notification_type set not null; exception when others then raise notice 'admin_notifications.notification_type could not be set not null yet: %', sqlerrm; end;
  begin alter table public.admin_notifications alter column type set not null; exception when others then raise notice 'admin_notifications.type could not be set not null yet: %', sqlerrm; end;
  begin alter table public.admin_notifications alter column title set not null; exception when others then raise notice 'admin_notifications.title could not be set not null yet: %', sqlerrm; end;
  begin alter table public.admin_notifications alter column severity set not null; exception when others then raise notice 'admin_notifications.severity could not be set not null yet: %', sqlerrm; end;
  begin alter table public.admin_notifications alter column is_read set not null; exception when others then raise notice 'admin_notifications.is_read could not be set not null yet: %', sqlerrm; end;
  begin alter table public.admin_notifications alter column metadata set not null; exception when others then raise notice 'admin_notifications.metadata could not be set not null yet: %', sqlerrm; end;
end $$;

create index if not exists admin_notifications_created_at_idx on public.admin_notifications(created_at desc);
create index if not exists admin_notifications_unread_idx on public.admin_notifications(is_read) where is_read = false;
create index if not exists admin_notifications_type_idx on public.admin_notifications(type);
create index if not exists admin_notifications_notification_type_idx on public.admin_notifications(notification_type);

insert into public.admin_notifications (
  notification_type,
  type,
  title,
  body,
  message,
  severity,
  action_url,
  target_url,
  is_read,
  metadata
)
select
  'launch_mode',
  'launch_mode',
  'Launch Mode is available',
  'Configure Opening Soon, countdown, global store lock, and launch subscribers from NEXORA HQ → Launch Mode.',
  'Configure Opening Soon, countdown, global store lock, and launch subscribers from NEXORA HQ → Launch Mode.',
  'info',
  '/nexora-admin/launch',
  '/nexora-admin/launch',
  false,
  jsonb_build_object('source', 'launch_mode_controls')
where not exists (
  select 1 from public.admin_notifications
  where coalesce(notification_type, type) = 'launch_mode'
    and title = 'Launch Mode is available'
    and coalesce(action_url, target_url) = '/nexora-admin/launch'
);

-- ------------------------------------------------------------
-- updated_at trigger helper
-- ------------------------------------------------------------

create or replace function public.nexora_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists launch_subscribers_touch_updated_at on public.launch_subscribers;
create trigger launch_subscribers_touch_updated_at
before update on public.launch_subscribers
for each row execute function public.nexora_touch_updated_at();

drop trigger if exists admin_notifications_touch_updated_at on public.admin_notifications;
create trigger admin_notifications_touch_updated_at
before update on public.admin_notifications
for each row execute function public.nexora_touch_updated_at();

drop trigger if exists site_settings_touch_updated_at on public.site_settings;
create trigger site_settings_touch_updated_at
before update on public.site_settings
for each row execute function public.nexora_touch_updated_at();
