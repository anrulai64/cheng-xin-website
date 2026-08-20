-- ============================================================================
-- 實績案例常見問題 (Case Study FAQ) — STEP 12H
-- ============================================================================
-- Adds ONE new table: public.case_faqs — a SHARED FAQ collection displayed in
-- the "常見問題" tab across Case Study detail pages. It is NOT per-case:
-- there is no case_id / category_id / slug column by design.
--
-- Safe to run multiple times (idempotent). Does NOT touch existing tables,
-- Admin Authentication, admin_users, Storage, the Article CMS, or any of the
-- existing case_* tables/columns/policies.
--
-- Reuses (does NOT recreate) helpers created by earlier migrations:
--   - public.set_updated_at()  (generic updated_at trigger fn, from 002)
--   - public.is_admin()        (admin check used by every case_* policy)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------
create table if not exists public.case_faqs (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  answer_html text not null,
  sort_order  integer not null default 0,
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Public list ordering (sort_order ASC, created_at ASC) + visibility filter.
create index if not exists case_faqs_sort_order_idx on public.case_faqs (sort_order);
create index if not exists case_faqs_is_visible_idx on public.case_faqs (is_visible);

-- ---------------------------------------------------------------------------
-- 2. updated_at trigger — REUSES the existing generic public.set_updated_at()
--    (same function every other case_* table uses; not redefined here).
-- ---------------------------------------------------------------------------
drop trigger if exists set_case_faqs_updated_at on public.case_faqs;
create trigger set_case_faqs_updated_at
  before update on public.case_faqs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Row Level Security — mirrors the project convention (public read of
--    visible rows; admin full management via public.is_admin()). No
--    service_role anywhere.
-- ---------------------------------------------------------------------------
alter table public.case_faqs enable row level security;

-- Public visitors: SELECT only visible rows.
drop policy if exists "case_faqs_select_public" on public.case_faqs;
create policy "case_faqs_select_public" on public.case_faqs
  for select using (is_visible = true);

-- Admins: SELECT everything (including hidden rows) for management.
drop policy if exists "case_faqs_select_admin" on public.case_faqs;
create policy "case_faqs_select_admin" on public.case_faqs
  for select to authenticated using (public.is_admin());

drop policy if exists "case_faqs_admin_insert" on public.case_faqs;
create policy "case_faqs_admin_insert" on public.case_faqs
  for insert to authenticated with check (public.is_admin());

drop policy if exists "case_faqs_admin_update" on public.case_faqs;
create policy "case_faqs_admin_update" on public.case_faqs
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "case_faqs_admin_delete" on public.case_faqs;
create policy "case_faqs_admin_delete" on public.case_faqs
  for delete to authenticated using (public.is_admin());
