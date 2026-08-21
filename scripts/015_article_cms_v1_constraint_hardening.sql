-- ============================================================================
-- ARTICLE CMS V1 — STEP A2-F: final constraint hardening
-- ============================================================================
-- This migration is REPOSITORY FILE ONLY. It has not been executed against
-- Live Supabase. Do not treat any ALTER TABLE below as active in the live
-- database until a human explicitly runs this script.
--
-- BACKGROUND:
-- 002_articles_schema.sql, 003_articles_storage.sql,
-- 012_article_cms_v1_schema.sql, 013_article_cms_v1_security.sql, and
-- 014_article_cms_v1_privilege_hardening.sql have now been executed
-- successfully on Live Supabase. Live preflight confirmed:
--   - public.articles row count = 0 (no existing row can violate a new
--     NOT NULL constraint on slug or category_id)
--   - public.article_categories currently has exactly 2 seeded rows
--     (最新消息/news, 知識文章/knowledge), and both already have a
--     non-null slug (no existing row can violate a new NOT NULL
--     constraint on article_categories.slug)
--
-- Because live-data state was previously unknown, 012 deliberately left
-- articles.slug, articles.category_id, and article_categories.slug
-- nullable. That live-data uncertainty is now resolved, so this migration
-- applies the final NOT NULL hardening that was always intended.
--
-- SCOPE: exactly three columns are tightened. No other column, index,
-- policy, grant, or default privilege is touched by this file.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Defensive precondition (fail loudly, do not fabricate data)
-- ----------------------------------------------------------------------------
-- This repository has no pre-existing DO-block convention (checked: no other
-- migration uses one). A short, read-only DO block is included here anyway
-- because it is simple to audit and gives a clear, named error instead of a
-- bare constraint-violation error if this migration is ever run against an
-- environment that does not match the live-preflight assumptions above.
-- It performs no mutation — it only raises an exception. If it does not
-- fire, the ALTER TABLE statements below are the actual and only schema
-- change made by this migration.
do $$
begin
  if exists (select 1 from public.articles where slug is null) then
    raise exception
      'Article CMS V1 015: aborting — public.articles has at least one row with a NULL slug. This migration does not fabricate fallback slugs; resolve the NULL(s) manually before re-running.';
  end if;

  if exists (select 1 from public.articles where category_id is null) then
    raise exception
      'Article CMS V1 015: aborting — public.articles has at least one row with a NULL category_id. This migration does not assign a default category; resolve the NULL(s) manually before re-running.';
  end if;

  if exists (select 1 from public.article_categories where slug is null) then
    raise exception
      'Article CMS V1 015: aborting — public.article_categories has at least one row with a NULL slug. This migration does not fabricate fallback slugs; resolve the NULL(s) manually before re-running.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Constraint hardening
-- ----------------------------------------------------------------------------
-- articles.slug and articles.category_id: SET NOT NULL only. The existing
-- partial unique index (articles_slug_unique_idx, WHERE slug IS NOT NULL,
-- created in 012) already enforces slug uniqueness and remains valid and
-- sufficient once slug can no longer be NULL — it is intentionally left
-- in place, not replaced, per scope lock.
alter table public.articles
  alter column slug set not null,
  alter column category_id set not null;

-- article_categories.slug: SET NOT NULL only. The existing UNIQUE constraint
-- from 002 already enforces uniqueness and is untouched by this migration.
alter table public.article_categories
  alter column slug set not null;

-- ============================================================================
-- Explicitly NOT done in this migration:
-- - No new uniqueness mechanism added for articles.slug or
--   article_categories.slug (existing mechanisms from 002/012 are retained
--   as-is).
-- - No column rename, type change, or default change.
-- - No RLS policy change (articles_select_public, articles_select_admin,
--   article_faqs_select_public/admin, article_related_select_public/admin,
--   categories_select_public all untouched).
-- - No GRANT or REVOKE change (013 and 014 privilege models untouched).
-- - No ALTER DEFAULT PRIVILEGES statement.
-- - No change to public.is_admin() or public.set_updated_at().
-- - No Storage change (article-images bucket/policies untouched).
-- - No Article, Category, FAQ, or Related Article data INSERT/UPDATE/DELETE.
-- - No Case CMS table, policy, grant, storage object, or application file
--   referenced or modified.
-- - No change to lib/site-data.ts or the six static blog Articles.
-- - No change to lib/supabase/database.types.ts (deferred to a later
--   post-live verification/type-sync STEP, once this migration has actually
--   been executed and verified live).
-- - No SQL executed against Live Supabase; no Supabase MCP call made.
-- ============================================================================
