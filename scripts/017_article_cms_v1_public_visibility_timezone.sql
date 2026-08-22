-- ============================================================================
-- ARTICLE CMS V1 — STEP A6-A-SECURITY: align public Article RLS date basis
-- to Asia/Taipei
-- ============================================================================
-- This migration is REPOSITORY FILE ONLY. It has not been executed against
-- Live Supabase. Do not treat any policy below as active in the live
-- database until a human explicitly runs this script.
--
-- BACKGROUND:
-- STEP A6-A implemented the CMS Public Article Read Contract in application
-- code (lib/articles/visibility.ts, lib/articles/public.ts). That code
-- computes "today" as a Taiwan calendar date:
--   Asia/Taipei
-- and applies:
--   status = 'published'
--   AND (start_date IS NULL OR start_date <= Taipei-today)
--   AND (end_date   IS NULL OR end_date   >= Taipei-today)
-- as defense-in-depth on top of the database RLS policies below.
--
-- However, the existing public SELECT policies from
-- 013_article_cms_v1_security.sql use PostgreSQL's `current_date`, which
-- resolves against the database/session timezone — NOT guaranteed to be
-- Asia/Taipei. Near Taiwan midnight this can disagree with the application
-- check (e.g. Taipei 2026-08-22 01:00 is still UTC 2026-08-21): a row the
-- application would consider visible could be rejected by RLS before the
-- application ever gets a chance to apply its own (looser, in this example)
-- check — application code cannot recover a row RLS has already hidden.
--
-- This migration closes that gap by replacing `current_date` with an
-- explicit Asia/Taipei calendar-date expression in the three affected
-- public SELECT policies, so the database and application share exactly
-- the same scheduling semantics. It changes ONLY the date basis — the
-- predicate shape (status + start_date/end_date window, publish_date
-- excluded) is otherwise identical to 013/014.
--
-- SCOPE: RLS policy predicates only. No schema, GRANT/REVOKE, Storage,
-- session/database timezone (SET timezone / ALTER DATABASE SET timezone /
-- ALTER ROLE SET timezone are never used), function, trigger, or data
-- change is made by this file.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Taipei-today SQL expression used throughout this migration
-- ----------------------------------------------------------------------------
-- (timezone('Asia/Taipei', now()))::date
--
-- Why this is independent of the database/session timezone:
--   - now() returns a `timestamptz` — an absolute point in time (UTC
--     internally), not a timezone-dependent value.
--   - timezone('Asia/Taipei', <timestamptz>) is PostgreSQL's documented
--     AT TIME ZONE conversion function: it converts that absolute instant
--     into a `timestamp` (no zone) representing the wall-clock time in the
--     named zone (Asia/Taipei, UTC+8, no DST) — regardless of what
--     timezone GUC the current session or database happens to have set.
--   - Casting that `timestamp` to `::date` truncates it to the Taiwan
--     calendar date, with no dependency on `current_date`/`current_setting
--     ('timezone')` or any session-level configuration.
-- This is the same expression named as "preferred equivalent" in the STEP
-- instructions, and it exactly mirrors the Taiwan-calendar-date semantics
-- already implemented in lib/articles/visibility.ts (Intl.DateTimeFormat
-- with timeZone: "Asia/Taipei") — only in SQL instead of TypeScript.

-- ---------------------------------------------------------------------------
-- 1. Articles — realign public visibility policy's date basis only
-- ---------------------------------------------------------------------------
-- Predicate shape is unchanged from 013_article_cms_v1_security.sql: only
-- `current_date` is replaced with the Taipei-today expression above.
-- publish_date remains excluded — it is editorial metadata only and MUST
-- NOT participate in the public visibility gate.
drop policy if exists "articles_select_public" on public.articles;
create policy "articles_select_public" on public.articles
  for select using (
    status = 'published'
    and (
      start_date is null
      or start_date <= (timezone('Asia/Taipei', now()))::date
    )
    and (
      end_date is null
      or end_date >= (timezone('Asia/Taipei', now()))::date
    )
  );

-- articles_select_admin (public.is_admin()) is intentionally left untouched
-- — admins already see all rows regardless of status/date window, and that
-- is not a date-basis concern.

-- ---------------------------------------------------------------------------
-- 2. Article FAQs — realign parent-visibility date basis to match
-- ---------------------------------------------------------------------------
-- Same change as above, applied to the parent-article lookup inside
-- article_faqs_select_public so a FAQ is public if and only if its parent
-- Article is public under the SAME Asia/Taipei predicate.
drop policy if exists "article_faqs_select_public" on public.article_faqs;
create policy "article_faqs_select_public" on public.article_faqs
  for select using (
    exists (
      select 1
      from public.articles a
      where a.id = article_faqs.article_id
        and a.status = 'published'
        and (
          a.start_date is null
          or a.start_date <= (timezone('Asia/Taipei', now()))::date
        )
        and (
          a.end_date is null
          or a.end_date >= (timezone('Asia/Taipei', now()))::date
        )
    )
  );

-- article_faqs_select_admin and all article_faqs admin write policies
-- (public.is_admin()) are left unchanged.

-- ---------------------------------------------------------------------------
-- 3. Related Articles — realign BOTH endpoint predicates to match
-- ---------------------------------------------------------------------------
-- Two-sided relation protection (introduced in 013) is preserved exactly:
-- a relation row is public only when BOTH the source article and the
-- target article independently satisfy the SAME Asia/Taipei predicate.
-- Only the date basis changes; the two-sided AND is unchanged.
drop policy if exists "article_related_select_public" on public.article_related_articles;
create policy "article_related_select_public" on public.article_related_articles
  for select using (
    exists (
      select 1
      from public.articles src
      where src.id = article_related_articles.article_id
        and src.status = 'published'
        and (
          src.start_date is null
          or src.start_date <= (timezone('Asia/Taipei', now()))::date
        )
        and (
          src.end_date is null
          or src.end_date >= (timezone('Asia/Taipei', now()))::date
        )
    )
    and exists (
      select 1
      from public.articles tgt
      where tgt.id = article_related_articles.related_article_id
        and tgt.status = 'published'
        and (
          tgt.start_date is null
          or tgt.start_date <= (timezone('Asia/Taipei', now()))::date
        )
        and (
          tgt.end_date is null
          or tgt.end_date >= (timezone('Asia/Taipei', now()))::date
        )
    )
  );

-- article_related_select_admin (public.is_admin(), scoped to authenticated
-- per 014_article_cms_v1_privilege_hardening.sql) and all
-- article_related_articles admin write policies are left unchanged.

-- ---------------------------------------------------------------------------
-- 4. Categories — intentionally unchanged
-- ---------------------------------------------------------------------------
-- categories_select_public keeps its existing USING (true) policy.
-- Categories are public SEO entities independent of Article count/visibility
-- and have no date-basis concept at all.

-- ---------------------------------------------------------------------------
-- 5. Explicitly NOT done in this migration
-- ---------------------------------------------------------------------------
-- - No SET timezone, ALTER DATABASE ... SET timezone, or ALTER ROLE ... SET
--   timezone statement — the Taiwan calendar date is computed explicitly
--   inside each policy predicate instead, per the STEP's explicit lock.
-- - No new SQL helper function created — the Taipei-today expression is
--   inlined directly in each predicate for auditability, per the STEP's
--   preference for explicit predicates over a new function.
-- - No change to articles_select_admin, article_faqs_select_admin,
--   article_related_select_admin, categories_select_public, or any
--   *_admin_insert/update/delete policy on any of the four Article CMS
--   tables.
-- - No GRANT/REVOKE/ALTER DEFAULT PRIVILEGES statement — the table-level
--   privilege model from 013/014 is untouched.
-- - No ALTER TABLE / CREATE TABLE / DROP TABLE / constraint / index /
--   trigger / function change.
-- - No Storage bucket/policy change (article-images is unmodified).
-- - No Article, Category, FAQ, or Related Article data INSERT/UPDATE/DELETE.
-- - No change to Case CMS tables, policies, grants, or Storage.
-- - No change to app/admin/**, app/blog/**, lib/articles/public.ts,
--   lib/articles/visibility.ts, lib/articles/sanitize.ts,
--   components/articles/article-content.tsx, lib/site-data.ts,
--   lib/supabase/database.types.ts, package.json, pnpm-lock.yaml, sitemap,
--   or structured data.
-- - No edit to any historical migration file (001–016) — this is a new,
--   standalone migration only.
-- - No SQL executed against Live Supabase; no Supabase MCP call made.
-- ============================================================================
