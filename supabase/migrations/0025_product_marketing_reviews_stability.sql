-- ============================================================
-- NEXORA — Product marketing controls + reviews stability
-- Safe migration only: no deletes, no truncates, no destructive data changes.
-- ============================================================

do $$ begin create extension if not exists pgcrypto; exception when others then raise notice 'pgcrypto unavailable: %', sqlerrm; end $$;

-- Product marketing flags used by Products HQ and the animated storefront bar.
alter table public.products
  add column if not exists show_in_announcement_bar boolean not null default false,
  add column if not exists announcement_text text,
  add column if not exists marketing_priority integer not null default 0;

create index if not exists products_announcement_bar_idx
  on public.products (show_in_announcement_bar, status, marketing_priority desc, created_at desc);

-- Reviews compatibility/stability. Keep legacy columns and add missing safe columns.
create table if not exists public.reviews (
  id uuid primary key default public.nexora_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_name text,
  customer_name text not null,
  customer_phone text,
  rating numeric(2,1) default 5,
  title text,
  body text,
  body_en text,
  body_ar text,
  images jsonb default '[]'::jsonb,
  featured boolean default false,
  status text default 'pending',
  review_type text default 'product',
  admin_reply text,
  approved_at timestamptz,
  helpful_count integer default 0,
  sort_order integer default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.reviews
  add column if not exists review_type text default 'product',
  add column if not exists customer_phone text,
  add column if not exists admin_reply text,
  add column if not exists approved_at timestamptz,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists body text;

update public.reviews
set body = coalesce(body, body_en, body_ar, '')
where body is null;

update public.reviews
set body_en = coalesce(body_en, body, body_ar, '')
where body_en is null;

update public.reviews
set review_type = case when product_id is null then 'site' else 'product' end
where review_type is null;

update public.reviews
set status = case when status in ('draft','pending','published','rejected','hidden','archived') then status else 'pending' end
where status is null or status not in ('draft','pending','published','rejected','hidden','archived');

alter table public.reviews drop constraint if exists reviews_status_check;
alter table public.reviews add constraint reviews_status_check check (status in ('draft','pending','published','rejected','hidden','archived'));

alter table public.reviews drop constraint if exists reviews_review_type_check;
alter table public.reviews add constraint reviews_review_type_check check (review_type in ('product','site'));

create index if not exists reviews_status_idx on public.reviews (status);
create index if not exists reviews_product_status_idx on public.reviews (product_id, status);
create index if not exists reviews_featured_status_idx on public.reviews (featured, status, sort_order, created_at desc);

alter table public.reviews enable row level security;

drop policy if exists "Public can read published reviews" on public.reviews;
create policy "Public can read published reviews" on public.reviews
  for select using (status = 'published');

notify pgrst, 'reload schema';
