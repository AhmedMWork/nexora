-- ============================================================
-- NEXORA — Product visibility, product-led drops/promotions, core flags,
-- unisex routing, customer conversion CRM, and delivery preview copy.
-- Safe migration only: no deletes, no truncates, no destructive changes.
-- This revision avoids references to optional legacy columns that may not exist
-- on every Supabase project, such as collection_id.
-- ============================================================

create extension if not exists pgcrypto;

create or replace function public.nexora_uuid()
returns uuid
language sql
stable
as $$
  select gen_random_uuid();
$$;

-- Product visibility and marketing fields. All additions are safe and idempotent.
alter table public.products
  add column if not exists collection text default 'core',
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
  add column if not exists drop_priority integer not null default 0,
  add column if not exists show_in_announcement_bar boolean not null default false,
  add column if not exists announcement_text text,
  add column if not exists marketing_priority integer not null default 0;

-- Normalize target audience. Men pages should include men/unisex/all;
-- Women pages should include women/unisex/all. This field prevents duplicating products.
update public.products
set target_audience = case
  when lower(coalesce(target_audience, '')) in ('men','women','unisex','all') then lower(target_audience)
  when lower(coalesce(gender, category, '')) in ('men','women','unisex') then lower(coalesce(gender, category))
  else 'unisex'
end
where target_audience is null
   or trim(target_audience) = ''
   or lower(target_audience) not in ('men','women','unisex','all');

-- Core compatibility. Some projects use collection text, older builds may not have collection_id.
-- Never reference collection_id directly because it may not exist and would break db push.
update public.products
set is_core = true
where coalesce(is_core, false) = false
  and lower(coalesce(collection, '')) in ('core', 'core essentials', 'core essential');

update public.products
set core_label = coalesce(nullif(core_label, ''), 'Core Essential')
where coalesce(is_core, false) = true;

-- Product-led drops/promotions. No separate admin page is needed; the product carries the state.
update public.products
set is_drop = true
where coalesce(is_drop, false) = false
  and coalesce(is_limited, false) = true;

update public.products
set show_in_announcement_bar = true
where coalesce(show_in_announcement_bar, false) = false
  and (coalesce(is_promotion, false) = true or coalesce(is_drop, false) = true);

alter table public.products drop constraint if exists products_target_audience_check;
alter table public.products add constraint products_target_audience_check
  check (target_audience in ('men','women','unisex','all'));

create index if not exists products_target_audience_idx on public.products (target_audience, status, created_at desc);
create index if not exists products_product_led_drop_idx on public.products (is_drop, status, drop_priority desc, created_at desc);
create index if not exists products_product_led_promo_idx on public.products (is_promotion, show_in_announcement_bar, status, promotion_priority desc, marketing_priority desc, created_at desc);
create index if not exists products_core_idx on public.products (is_core, core_priority desc, created_at desc);

-- CRM safety. Create/alter only; do not remove or reset customer data.
create table if not exists public.customer_profiles (
  id uuid primary key default public.nexora_uuid(),
  phone text,
  email text,
  full_name text,
  total_orders integer not null default 0,
  total_revenue numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.customer_profiles
  add column if not exists status text default 'active',
  add column if not exists tags text[] not null default '{}',
  add column if not exists lead_score integer not null default 0,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists follow_up_at timestamptz,
  add column if not exists notes jsonb not null default '[]'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.customer_notes (
  id uuid primary key default public.nexora_uuid(),
  customer_id text not null,
  note text not null,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists customer_profiles_status_idx on public.customer_profiles (status);
create index if not exists customer_profiles_lead_score_idx on public.customer_profiles (lead_score desc, updated_at desc);
create index if not exists customer_notes_customer_idx on public.customer_notes (customer_id, created_at desc);

notify pgrst, 'reload schema';
