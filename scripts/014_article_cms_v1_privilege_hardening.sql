-- ============================================================================
-- ARTICLE CMS V1 — STEP A2-E4-FIX: privilege hardening
-- ============================================================================
-- This migration is REPOSITORY FILE ONLY. It has not been executed against
-- Live Supabase. Do not treat any REVOKE/policy below as active in the live
-- database until a human explicitly runs this script.
--
-- BACKGROUND:
-- 002_articles_schema.sql, 003_articles_storage.sql,
-- 012_article_cms_v1_schema.sql, and 013_article_cms_v1_security.sql have
-- now been executed successfully on Live Supabase. Live acceptance after
-- 013 found two security hardening issues that this migration exists to fix.
--
-- ISSUE 1 — EXCESS TABLE PRIVILEGES:
-- Live pg catalogs show anon and authenticated already held MAINTAIN,
-- TRUNCATE, TRIGGER, and REFERENCES on all four Article CMS tables
-- (article_categories, articles, article_related_articles, article_faqs)
-- before 013 ever ran. MAINTAIN was confirmed directly via a follow-up
-- pg_class ACL inspection (relacl), performed after the initial fix below
-- was drafted with only three privileges — the audit found a fourth. 013
-- only issued GRANT statements for the intended privileges — GRANT never
-- revokes a privilege a role already has, so these pre-existing excess
-- privileges survived 013 untouched. TRUNCATE in particular must not remain
-- available to public-facing application roles: it would let anon or
-- authenticated wipe an entire Article CMS table in one statement,
-- completely bypassing RLS (TRUNCATE is not row-scoped and is not subject
-- to SELECT/DELETE row policies at all). MAINTAIN (VACUUM, ANALYZE, CLUSTER,
-- REINDEX, and other maintenance commands) is similarly not something a
-- public-facing role should hold on these tables.
--
-- This migration intentionally hardens only these four EXISTING Article CMS
-- tables. The public-schema default ACLs were also found to grant
-- MAINTAIN/REFERENCES/TRIGGER/TRUNCATE to anon/authenticated for future
-- tables, but ALTER DEFAULT PRIVILEGES is a project-wide/platform-level
-- decision that could affect tables outside Article CMS, so it is
-- deliberately out of scope here and deferred to a separate security audit.
--
-- ISSUE 2 — ARTICLE RELATED ADMIN SELECT POLICY ROLE:
-- 013 created article_related_select_admin without an explicit TO clause,
-- so Live pg_policies shows roles = {public} instead of {authenticated}.
-- public.is_admin() still correctly blocks anon/non-admin callers at the
-- USING-clause level, so this was not an active data leak — but it is
-- inconsistent with articles_select_admin and article_faqs_select_admin,
-- which are both scoped TO authenticated. This migration realigns
-- article_related_select_admin to the same explicit least-privilege shape.
--
-- FINAL REQUIRED TABLE-LEVEL PRIVILEGE MODEL (after this migration):
--   anon          -> SELECT only
--   authenticated -> SELECT, INSERT, UPDATE, DELETE only
-- Neither role retains MAINTAIN, TRUNCATE, TRIGGER, or REFERENCES on any of
-- the four Article CMS tables. postgres/service_role privileges are not
-- touched, and no ALTER DEFAULT PRIVILEGES statement is issued (see above).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Revoke excess privileges discovered on Live Supabase
-- ---------------------------------------------------------------------------
-- These privileges were never intentionally granted by any migration in this
-- repository (002, 003, 012, 013 only ever GRANT — none of them REVOKE).
-- Live verification after 013 found MAINTAIN/TRUNCATE/TRIGGER/REFERENCES
-- already present on anon and authenticated for all four tables below, most
-- likely inherited from the public-schema default ACLs or an out-of-band
-- change made directly against the live database. This step removes them
-- explicitly so the live privilege set matches the intended repository
-- model exactly, without altering those default ACLs themselves (see
-- background above — that cleanup is deliberately out of scope here).
revoke maintain, truncate, trigger, references on table
  public.article_categories,
  public.articles,
  public.article_related_articles,
  public.article_faqs
from anon;

revoke maintain, truncate, trigger, references on table
  public.article_categories,
  public.articles,
  public.article_related_articles,
  public.article_faqs
from authenticated;

-- Explicitly NOT revoked: anon SELECT; authenticated SELECT / INSERT /
-- UPDATE / DELETE (granted intentionally by 013_article_cms_v1_security.sql
-- and still required for the app to function). postgres and service_role
-- privileges are not referenced anywhere in this file.

-- ---------------------------------------------------------------------------
-- 2. Fix article_related_select_admin role scope
-- ---------------------------------------------------------------------------
-- Re-declared with an explicit "to authenticated" clause so its role scope
-- matches articles_select_admin and article_faqs_select_admin exactly. This
-- is a least-privilege consistency fix, not a behavior change: public.is_admin()
-- already made this policy a no-op for anon before this fix.
drop policy if exists "article_related_select_admin" on public.article_related_articles;
create policy "article_related_select_admin" on public.article_related_articles
  for select
  to authenticated
  using (public.is_admin());

-- article_related_select_public is intentionally NOT modified by this
-- migration — its source/target visibility predicate is unchanged.

-- ---------------------------------------------------------------------------
-- 3. Explicitly NOT done in this migration
-- ---------------------------------------------------------------------------
-- - No change to anon SELECT or authenticated SELECT/INSERT/UPDATE/DELETE
--   table grants (still governed by 013_article_cms_v1_security.sql).
-- - No change to articles_select_public, articles_select_admin,
--   article_faqs_select_public, article_faqs_select_admin,
--   categories_select_public, or any Article Admin INSERT/UPDATE/DELETE
--   policy on any of the four tables.
-- - No Storage bucket/policy change (article-images is unmodified).
-- - No change to Case CMS tables, policies, or grants.
-- - No change to database.types.ts or any application file.
-- - No change to postgres or service_role privileges.
-- - No ALTER DEFAULT PRIVILEGES statement (public-schema default ACL
--   cleanup is deferred to a separate, project-wide security audit).
-- - No SQL executed against Live Supabase; no Supabase MCP call made.
