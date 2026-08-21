-- ============================================================================
-- ARTICLE CMS V1 — STEP A2-B: table GRANTs + public visibility RLS cutover
-- ============================================================================
-- This migration is REPOSITORY FILE ONLY. It has not been executed against
-- Live Supabase. Do not treat any GRANT/policy below as active in the live
-- database until a human explicitly runs this script.
--
-- WHY EXPLICIT GRANTS ARE REQUIRED IN ADDITION TO RLS:
-- PostgreSQL checks table-level privileges BEFORE row-level security is ever
-- evaluated. RLS policies alone do not grant the underlying SELECT/INSERT/
-- UPDATE/DELETE privilege on a table — this project already hit exactly this
-- bug twice (scripts/009_admin_users_select_grant.sql for admin_users, and
-- scripts/010_case_table_grants.sql for the Case Study CMS tables). No
-- equivalent grant migration was ever written for the Article CMS tables
-- created by 002_articles_schema.sql / 012_article_cms_v1_schema.sql — this
-- migration closes that gap.
--
-- PRIVILEGE MODEL:
--   anon          -> SELECT only (never a write privilege)
--   authenticated -> SELECT, INSERT, UPDATE, DELETE (table-level only; RLS
--                    policies remain the sole authority on which specific
--                    rows an authenticated, non-admin request may actually
--                    touch — the existing *_admin_insert/update/delete
--                    policies already restrict writes to public.is_admin())
-- No TRUNCATE, TRIGGER, or REFERENCES privileges are granted to anyone here.
-- postgres/service_role privileges are not touched.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Table-level GRANTs — Article CMS tables
-- ---------------------------------------------------------------------------
grant select on table
  public.article_categories,
  public.articles,
  public.article_related_articles,
  public.article_faqs
to anon, authenticated;

grant insert, update, delete on table
  public.article_categories,
  public.articles,
  public.article_related_articles,
  public.article_faqs
to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Articles — public visibility RLS cutover
-- ---------------------------------------------------------------------------
-- FINAL V1 PRODUCT DECISION: publish_date is editorial metadata (the date an
-- article displays as "published"), not the public visibility gate. The
-- scheduling window that actually controls whether a row is publicly
-- readable is start_date (lower bound) / end_date (upper bound), combined
-- with the new status column. publish_date is intentionally NOT part of
-- this predicate below.
drop policy if exists "articles_select_public" on public.articles;
create policy "articles_select_public" on public.articles
  for select using (
    status = 'published'
    and (start_date is null or start_date <= current_date)
    and (end_date is null or end_date >= current_date)
  );

-- Admin SELECT-all policy is intentionally left untouched (not recreated):
-- "articles_select_admin" (public.is_admin()) already grants admins
-- unrestricted read access regardless of status/start_date/end_date, and
-- there is no technical reason to recreate it here.

-- ---------------------------------------------------------------------------
-- 3. Article FAQs — realign public visibility to the FINAL predicate above
-- ---------------------------------------------------------------------------
-- 012_article_cms_v1_schema.sql created article_faqs_select_public against
-- an interim predicate that still included "publish_date <= current_date"
-- (because articles_select_public had not been cut over yet at that time).
-- Now that step 2 above has cut articles_select_public over to the FINAL
-- status + scheduling-window contract, this FAQ policy is realigned to
-- match it exactly, so a FAQ is public if and only if its parent article is:
--   status = 'published'
--   AND (start_date is null or start_date <= current_date)
--   AND (end_date is null or end_date >= current_date)
-- draft parent -> FAQ hidden; offline parent -> FAQ hidden; future
-- start_date -> FAQ hidden; past end_date -> FAQ hidden.
drop policy if exists "article_faqs_select_public" on public.article_faqs;
create policy "article_faqs_select_public" on public.article_faqs
  for select using (
    exists (
      select 1
      from public.articles a
      where a.id = article_faqs.article_id
        and a.status = 'published'
        and (a.start_date is null or a.start_date <= current_date)
        and (a.end_date is null or a.end_date >= current_date)
    )
  );

-- article_faqs_select_admin, article_faqs_admin_insert/update/delete (all
-- gated by public.is_admin()) are left unchanged.

-- ---------------------------------------------------------------------------
-- 4. Related Articles — public visibility must not leak private relationships
-- ---------------------------------------------------------------------------
-- A1 found article_related_articles' public SELECT policy used
-- USING (true) — unconditionally readable. Because each row references two
-- article IDs (article_id, related_article_id), unrestricted SELECT could
-- let an unauthenticated caller enumerate which articles are related to a
-- draft/offline article, or discover the existence/ID of a draft/offline
-- article via the relation row itself, even though the article row itself
-- would be correctly hidden by articles_select_public. This migration
-- closes that gap: a relation row is now public only when BOTH the source
-- and the target article are themselves publicly visible under the FINAL
-- predicate above. Directionality and schema are unchanged — only the
-- public SELECT policy's condition is strengthened.
drop policy if exists "article_related_select_public" on public.article_related_articles;
create policy "article_related_select_public" on public.article_related_articles
  for select using (
    exists (
      select 1
      from public.articles src
      where src.id = article_related_articles.article_id
        and src.status = 'published'
        and (src.start_date is null or src.start_date <= current_date)
        and (src.end_date is null or src.end_date >= current_date)
    )
    and exists (
      select 1
      from public.articles tgt
      where tgt.id = article_related_articles.related_article_id
        and tgt.status = 'published'
        and (tgt.start_date is null or tgt.start_date <= current_date)
        and (tgt.end_date is null or tgt.end_date >= current_date)
    )
  );

-- Admin SELECT-all policy: without this, an admin would be unable to read
-- relation rows involving a draft/offline article once the stricter public
-- policy above lands, breaking Related Article management in the future
-- Article CMS admin UI. Mirrors articles_select_admin / article_faqs_select_admin.
drop policy if exists "article_related_select_admin" on public.article_related_articles;
create policy "article_related_select_admin" on public.article_related_articles
  for select using (public.is_admin());

-- article_related_admin_insert/update/delete (all gated by public.is_admin())
-- are left unchanged.

-- ---------------------------------------------------------------------------
-- 5. Categories — intentionally unchanged
-- ---------------------------------------------------------------------------
-- article_categories keeps its existing "categories_select_public" USING
-- (true) policy. Categories are public SEO entities and may validly exist
-- with zero currently-visible articles; category visibility is deliberately
-- NOT tied to article count or article visibility.

-- ---------------------------------------------------------------------------
-- 6. Explicitly NOT done in this migration
-- ---------------------------------------------------------------------------
-- - No Storage bucket/policy change (article-images is unmodified).
-- - No NOT NULL tightening on articles.slug, articles.category_id, or
--   article_categories.slug (still pending live-data preflight).
-- - No legacy column (video_url, external_url, head_code on either table,
--   image_url on article_categories) is dropped, renamed, or backfilled.
-- - No Article/Category/FAQ/related-article data is inserted, updated, or
--   migrated.
-- - No change to admin write policies (*_admin_insert/update/delete) on any
--   of the four tables — all remain gated by public.is_admin().
