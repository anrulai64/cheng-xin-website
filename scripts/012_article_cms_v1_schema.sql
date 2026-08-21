-- ============================================================================
-- ARTICLE CMS V1 — STEP A2-A: additive schema foundation (review only)
-- ============================================================================
-- This migration is REPOSITORY FILE ONLY. It has not been executed against
-- Live Supabase. Do not treat any column/table below as present in the live
-- database until a human explicitly runs this script.
--
-- Scope: adds new, nullable-or-safely-defaulted columns to public.articles,
-- and creates one new child table (public.article_faqs). It does NOT:
--   - touch public.article_categories' or public.articles' existing columns
--   - change the existing "articles_select_public" RLS policy
--   - add table GRANTs for any article_* table (deferred to a security STEP)
--   - touch Storage, Case CMS, admin_users, or any legacy column
--   - insert/update/delete any Article, Category, or FAQ row
--
-- Reuses (does NOT recreate) helpers created by 002_articles_schema.sql:
--   - public.is_admin()        (admin check, SECURITY DEFINER)
--   - public.set_updated_at()  (generic updated_at trigger fn)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. public.articles — new columns
-- ---------------------------------------------------------------------------

-- status: editorial state, independent of the publish-date scheduling window.
-- Conservative default 'draft' — existing rows (if any) must NOT become
-- publicly visible merely because this migration ran. Text + CHECK is used
-- instead of a Postgres enum for portability and simpler future migrations.
alter table public.articles
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'published', 'offline'));

create index if not exists articles_status_idx on public.articles (status);

-- excerpt: public teaser text. Nullable — no fabricated default, no
-- extraction from content_html, no backfill. Enforced as recommended/
-- required at the application layer, not the database layer, for now.
alter table public.articles
  add column if not exists excerpt text;

-- cover_alt: accessible alt text for cover_image_url. Nullable — no
-- fabricated value (e.g. copying title) is written here; that conditional
-- rule ("required when a cover image exists") belongs to application
-- validation, not this migration.
alter table public.articles
  add column if not exists cover_alt text;

-- content_updated_date: application-managed "meaningful content changed"
-- timestamp, distinct from the system-level `updated_at` column (which
-- fires on every UPDATE, including internal-only edits, and therefore must
-- never be exposed as a public "updated" date). No trigger is created for
-- this column — the application decides when it changes.
alter table public.articles
  add column if not exists content_updated_date timestamptz;

-- Article slug uniqueness: a plain UNIQUE constraint/index in PostgreSQL
-- already permits an unlimited number of NULL slugs (NULL is never equal to
-- NULL), so this is safe even if legacy rows currently have no slug. It is
-- written as a partial index (WHERE slug is not null) to make that intent
-- explicit rather than relying on implicit NULL semantics.
--
-- FINAL NOT NULL REQUIRES LIVE DATA PREFLIGHT: slug is intentionally left
-- nullable here. Tightening to NOT NULL must wait for a verified live-data
-- check confirming no existing row has a NULL slug.
create unique index if not exists articles_slug_unique_idx
  on public.articles (slug)
  where slug is not null;

-- category_id: left nullable in this STEP.
-- FINAL NOT NULL REQUIRES LIVE DATA PREFLIGHT: tightening to NOT NULL must
-- wait for a verified live-data check confirming no existing row has a NULL
-- category_id. The application can enforce category selection in the admin
-- form before the database constraint is ever tightened.

-- ---------------------------------------------------------------------------
-- 2. public.article_categories — no column changes in this STEP
-- ---------------------------------------------------------------------------
-- article_categories.slug is already UNIQUE (from 002_articles_schema.sql).
-- FINAL NOT NULL REQUIRES LIVE DATA PREFLIGHT: leaving nullable here; the
-- existing UNIQUE constraint is preserved unmodified and no redundant second
-- uniqueness mechanism is added. Seeded category rows are not touched.

-- ---------------------------------------------------------------------------
-- 3. public.article_faqs — new child table
-- ---------------------------------------------------------------------------
create table if not exists public.article_faqs (
  id         uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  question   text not null,
  answer     text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Supports Article-scoped ordered FAQ retrieval.
create index if not exists article_faqs_article_id_sort_idx
  on public.article_faqs (article_id, sort_order);

-- updated_at trigger — REUSES the existing generic public.set_updated_at()
-- (same function every other article_*/case_* table uses; not redefined).
drop trigger if exists set_article_faqs_updated_at on public.article_faqs;
create trigger set_article_faqs_updated_at
  before update on public.article_faqs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. article_faqs — Row Level Security
-- ---------------------------------------------------------------------------
alter table public.article_faqs enable row level security;

-- Admins: read every FAQ row (including ones belonging to draft/offline
-- articles) for management purposes.
drop policy if exists "article_faqs_select_admin" on public.article_faqs;
create policy "article_faqs_select_admin" on public.article_faqs
  for select to authenticated using (public.is_admin());

-- Public: a FAQ row is visible ONLY when its parent article is publicly
-- visible. This explicitly implements the TARGET V1 visibility contract
-- (status = 'published' AND publish window valid) directly against the
-- parent articles row, rather than reusing today's articles_select_public
-- policy — which still only checks the date window and does not yet check
-- status. articles_select_public itself is intentionally NOT changed in
-- this migration (that cutover is a separate, later security STEP), so this
-- policy is written independently to avoid ever exposing FAQs for a
-- draft/offline article, even before that later cutover happens.
drop policy if exists "article_faqs_select_public" on public.article_faqs;
create policy "article_faqs_select_public" on public.article_faqs
  for select using (
    exists (
      select 1
      from public.articles a
      where a.id = article_faqs.article_id
        and a.status = 'published'
        and a.publish_date <= current_date
        and (a.start_date is null or a.start_date <= current_date)
        and (a.end_date is null or a.end_date >= current_date)
    )
  );

-- Admin-only writes, matching every other article_*/case_* table.
drop policy if exists "article_faqs_admin_insert" on public.article_faqs;
create policy "article_faqs_admin_insert" on public.article_faqs
  for insert to authenticated with check (public.is_admin());

drop policy if exists "article_faqs_admin_update" on public.article_faqs;
create policy "article_faqs_admin_update" on public.article_faqs
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "article_faqs_admin_delete" on public.article_faqs;
create policy "article_faqs_admin_delete" on public.article_faqs
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. Explicitly NOT done in this STEP (see STEP A2-A instructions)
-- ---------------------------------------------------------------------------
-- - No change to the existing "articles_select_public" policy.
-- - No table GRANTs added for articles / article_categories /
--   article_related_articles / article_faqs (deferred to a dedicated
--   security migration STEP, matching the article-table GRANT gap noted in
--   STEP A1).
-- - No Storage bucket/policy change (article-images is unmodified).
-- - No legacy column (video_url, external_url, head_code on either table,
--   image_url on article_categories) is dropped, renamed, or backfilled.
-- - No change to publish_date / start_date / end_date types, defaults, or
--   values.
-- - No Article/Category/FAQ/related-article data is inserted, updated, or
--   migrated.
