-- ============================================================================
-- 實績案例管理系統 (Case Study CMS) schema + RLS  — STEP 1A (schema only)
-- ============================================================================
-- Safe to run multiple times (idempotent). Does NOT touch existing tables,
-- authentication, admin_users, the legacy `case_studies` table, or the Article
-- CMS (`article_*`). No Storage bucket here (that is STEP 1B).
--
-- Run this in the v0 Scripts panel (or the Supabase SQL editor) against the
-- connected project. NOTE: do not execute as part of this step — creation only.
--
-- Depends on helpers created by earlier scripts (002): public.is_admin() and
-- public.set_updated_at(). They are re-created here defensively so this file
-- is self-contained and order-independent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Shared helpers (idempotent; identical to earlier scripts)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
       or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. case_categories  (實績案例分類)
-- ---------------------------------------------------------------------------
create table if not exists public.case_categories (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  seo_title       text,
  seo_keywords    text,
  seo_description text,
  head_code       text,
  slug            text unique,
  image_url       text,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists case_categories_slug_idx       on public.case_categories (slug);
create index if not exists case_categories_sort_order_idx on public.case_categories (sort_order);

-- ---------------------------------------------------------------------------
-- 2. case_items  (實績案例 — legacy product-style record, renamed as a "case")
-- ---------------------------------------------------------------------------
-- Legacy note: the first implementation intentionally preserves commerce-style
-- fields (price / stock / shipping) from the source product model. They are
-- nullable and may be retired in a later step; kept now to match the legacy
-- required-field behavior and data shape.
create table if not exists public.case_items (
  id                        uuid primary key default gen_random_uuid(),
  category_id               uuid not null references public.case_categories(id) on delete restrict,
  name                      text not null,
  short_description         text,

  -- SEO
  seo_title                 text,
  seo_keywords              text,
  seo_description           text,
  head_code                 text,
  slug                      text unique,

  -- Legacy price fields (nullable; commerce-oriented, retained for now)
  price                     numeric(12,2),
  original_price            numeric(12,2),

  -- Case flags (legacy product-type booleans)
  is_home                   boolean not null default false,
  is_new                    boolean not null default false,
  is_hot                    boolean not null default false,
  is_recommended            boolean not null default false,

  -- Publication window + state (legacy states: sale / display / offline)
  publish_start             timestamptz,
  publish_end               timestamptz,
  status                    text not null default 'display'
                              check (status in ('sale', 'display', 'offline')),

  -- Content
  description_html          text,
  detail_html              text,

  -- Legacy free-text note
  note                      text,

  -- Specification
  specification_type        text not null,
  specification_description text,

  -- Legacy product code, renamed. Required + unique (legacy 料號 behavior).
  case_code                 text not null unique,

  -- Legacy stock fields (nullable; commerce-oriented, retained for now)
  stock_quantity            integer,
  safety_stock              integer,

  -- Shipping: the legacy shipping-rule schema is NOT known from existing code.
  -- Represented conservatively as a single nullable free-form text column so we
  -- do not invent rule values. Revisit once the legacy rule set is confirmed.
  shipping_rule             text,

  -- Ordering
  sort_order                integer not null default 0,

  -- System
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists case_items_category_id_idx   on public.case_items (category_id);
create index if not exists case_items_slug_idx          on public.case_items (slug);
create index if not exists case_items_sort_order_idx    on public.case_items (sort_order);
create index if not exists case_items_status_idx        on public.case_items (status);
create index if not exists case_items_publish_start_idx on public.case_items (publish_start);
create index if not exists case_items_publish_end_idx   on public.case_items (publish_end);

-- ---------------------------------------------------------------------------
-- 3. case_images  (one case → many images; sort_order reserved for drag sort)
-- ---------------------------------------------------------------------------
create table if not exists public.case_images (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references public.case_items(id) on delete cascade,
  storage_path text not null,
  public_url   text,
  alt_text     text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists case_images_case_id_idx on public.case_images (case_id);

-- ---------------------------------------------------------------------------
-- 4. case_related_cases  (ordered many-to-many; no self-ref, no duplicates)
-- ---------------------------------------------------------------------------
create table if not exists public.case_related_cases (
  case_id         uuid not null references public.case_items(id) on delete cascade,
  related_case_id uuid not null references public.case_items(id) on delete cascade,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  primary key (case_id, related_case_id),
  constraint case_related_no_self check (case_id <> related_case_id)
);

create index if not exists case_related_case_id_idx on public.case_related_cases (case_id);

-- ---------------------------------------------------------------------------
-- 5. case_intro_content  (legacy "商品介紹文字" shared block; singleton-ish)
-- ---------------------------------------------------------------------------
-- Kept intentionally simple for v1: a small shared block of HTML content with a
-- visibility flag. A partial unique index enforces at most ONE visible row,
-- giving a safe singleton without extra machinery. Not redesigned into FAQs.
create table if not exists public.case_intro_content (
  id           uuid primary key default gen_random_uuid(),
  content_html text,
  is_visible   boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index if not exists case_intro_single_visible_idx
  on public.case_intro_content (is_visible)
  where is_visible = true;

-- ---------------------------------------------------------------------------
-- 6. updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists set_case_categories_updated_at on public.case_categories;
create trigger set_case_categories_updated_at
  before update on public.case_categories
  for each row execute function public.set_updated_at();

drop trigger if exists set_case_items_updated_at on public.case_items;
create trigger set_case_items_updated_at
  before update on public.case_items
  for each row execute function public.set_updated_at();

drop trigger if exists set_case_intro_content_updated_at on public.case_intro_content;
create trigger set_case_intro_content_updated_at
  before update on public.case_intro_content
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Row Level Security  (public read + admin write, per project convention)
-- ---------------------------------------------------------------------------
alter table public.case_categories    enable row level security;
alter table public.case_items         enable row level security;
alter table public.case_images        enable row level security;
alter table public.case_related_cases enable row level security;
alter table public.case_intro_content enable row level security;

-- --- case_categories: public read, admin write ---
drop policy if exists "case_categories_select_public" on public.case_categories;
create policy "case_categories_select_public" on public.case_categories
  for select using (true);

drop policy if exists "case_categories_admin_insert" on public.case_categories;
create policy "case_categories_admin_insert" on public.case_categories
  for insert to authenticated with check (public.is_admin());

drop policy if exists "case_categories_admin_update" on public.case_categories;
create policy "case_categories_admin_update" on public.case_categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "case_categories_admin_delete" on public.case_categories;
create policy "case_categories_admin_delete" on public.case_categories
  for delete to authenticated using (public.is_admin());

-- --- case_items: admins read everything; public reads only visible cases ---
drop policy if exists "case_items_select_admin" on public.case_items;
create policy "case_items_select_admin" on public.case_items
  for select to authenticated using (public.is_admin());

drop policy if exists "case_items_select_public" on public.case_items;
create policy "case_items_select_public" on public.case_items
  for select using (
    status <> 'offline'
    and (publish_start is null or publish_start <= now())
    and (publish_end   is null or publish_end   >= now())
  );

drop policy if exists "case_items_admin_insert" on public.case_items;
create policy "case_items_admin_insert" on public.case_items
  for insert to authenticated with check (public.is_admin());

drop policy if exists "case_items_admin_update" on public.case_items;
create policy "case_items_admin_update" on public.case_items
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "case_items_admin_delete" on public.case_items;
create policy "case_items_admin_delete" on public.case_items
  for delete to authenticated using (public.is_admin());

-- --- case_images: public read, admin write ---
drop policy if exists "case_images_select_public" on public.case_images;
create policy "case_images_select_public" on public.case_images
  for select using (true);

drop policy if exists "case_images_admin_insert" on public.case_images;
create policy "case_images_admin_insert" on public.case_images
  for insert to authenticated with check (public.is_admin());

drop policy if exists "case_images_admin_update" on public.case_images;
create policy "case_images_admin_update" on public.case_images
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "case_images_admin_delete" on public.case_images;
create policy "case_images_admin_delete" on public.case_images
  for delete to authenticated using (public.is_admin());

-- --- case_related_cases: public read, admin write ---
drop policy if exists "case_related_select_public" on public.case_related_cases;
create policy "case_related_select_public" on public.case_related_cases
  for select using (true);

drop policy if exists "case_related_admin_insert" on public.case_related_cases;
create policy "case_related_admin_insert" on public.case_related_cases
  for insert to authenticated with check (public.is_admin());

drop policy if exists "case_related_admin_update" on public.case_related_cases;
create policy "case_related_admin_update" on public.case_related_cases
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "case_related_admin_delete" on public.case_related_cases;
create policy "case_related_admin_delete" on public.case_related_cases
  for delete to authenticated using (public.is_admin());

-- --- case_intro_content: public reads visible; admin writes ---
drop policy if exists "case_intro_select_public" on public.case_intro_content;
create policy "case_intro_select_public" on public.case_intro_content
  for select using (is_visible = true);

drop policy if exists "case_intro_select_admin" on public.case_intro_content;
create policy "case_intro_select_admin" on public.case_intro_content
  for select to authenticated using (public.is_admin());

drop policy if exists "case_intro_admin_insert" on public.case_intro_content;
create policy "case_intro_admin_insert" on public.case_intro_content
  for insert to authenticated with check (public.is_admin());

drop policy if exists "case_intro_admin_update" on public.case_intro_content;
create policy "case_intro_admin_update" on public.case_intro_content
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "case_intro_admin_delete" on public.case_intro_content;
create policy "case_intro_admin_delete" on public.case_intro_content
  for delete to authenticated using (public.is_admin());
