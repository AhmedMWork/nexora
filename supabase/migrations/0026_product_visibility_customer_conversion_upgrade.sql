-- ============================================================
-- NEXORA — Product visibility, product-led drops/promotions, core flags,
-- unisex routing, customer conversion CRM, and delivery preview copy.
-- Safe migration only: no deletes, no truncates, no destructive changes.
-- ============================================================

create extension if not exists pgcrypto;

create or replace function public.nexora_uuid()
returns uuid
language sql
stable
as $$
  select gen_random_uuid();
$$;

alter table public.products
  add column if not exists target_audience text not null default 'unisex',
  add column if not exists is_core boolean not null default false,
  add column if not exists core_label text,
  add column if not exists core_priority integer not null default 0,
  add column if not exists is_promotion boolean not null default false,
  add column if not exists promotion_label text,
  add column if not exists promotion_text text,
  add column if not exists promotion_priority integer not null default 0,
  add column if not exists is_drop boolean not null default false,
  add column if not exists drop_name text,
  add column if not exists drop_label text,
  add column if not exists drop_start_at timestamptz,
  add column if not exists drop_end_at timestamptz,
  add column if not exists drop_priority integer not null default 0;

update public.products
set target_audience = case
  when lower(coalesce(target_audience, '')) in ('men','women','unisex','all') then lower(target_audience)
  when lower(coalesce(gender, category, '')) in ('men','women','unisex') then lower(coalesce(gender, category))
  else 'unisex'
end
where target_audience is null or target_audience = '';

update public.products
set is_core = true
where coalesce(is_core, false) = false
  and lower(coalesce(collection, collection_id, '')) = 'core';

update public.products
set is_drop = true
where coalesce(is_drop, false) = false
  and coalesce(is_limited, false) = true;

update public.products
set show_in_announcement_bar = true
where coalesce(show_in_announcement_bar, false) = false
  and coalesce(is_promotion, false) = true;

alter table public.products drop constraint if exists products_target_audience_check;
alter table public.products add constraint products_target_audience_check
  check (target_audience in ('men','women','unisex','all'));

create index if not exists products_target_audience_idx on public.products (target_audience, status, created_at desc);
create index if not exists products_product_led_drop_idx on public.products (is_drop, status, drop_priority desc, created_at desc);
create index if not exists products_product_led_promo_idx on public.products (is_promotion, show_in_announcement_bar, status, promotion_priority desc, marketing_priority desc, created_at desc);
create index if not exists products_core_idx on public.products (is_core, core_priority desc, created_at desc);

create table if not exists public.customer_notes (
  id uuid primary key default public.nexora_uuid(),
  customer_id text not null,
  note text not null,
  created_by text,
  created_at timestamptz not null default now()
);

alter table public.customer_profiles
  add column if not exists status text default 'active',
  add column if not exists tags text[] not null default '{}',
  add column if not exists lead_score integer not null default 0,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists follow_up_at timestamptz,
  add column if not exists notes jsonb not null default '[]'::jsonb;

create index if not exists customer_profiles_status_idx on public.customer_profiles (status);
create index if not exists customer_profiles_lead_score_idx on public.customer_profiles (lead_score desc, updated_at desc);
create index if not exists customer_notes_customer_idx on public.customer_notes (customer_id, created_at desc);

notify pgrst, 'reload schema';
