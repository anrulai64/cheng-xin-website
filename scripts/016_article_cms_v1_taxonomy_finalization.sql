-- ============================================================================
-- ARTICLE CMS V1 — STEP A3-F: taxonomy finalization
-- ============================================================================
-- This migration is REPOSITORY FILE ONLY. It has not been executed against
-- Live Supabase. Do not treat any INSERT/DELETE below as applied to the live
-- database until a human explicitly runs this script.
--
-- BACKGROUND:
-- 012-015 (schema, security, privilege hardening, constraint hardening) have
-- already been executed successfully on Live Supabase. Article Category
-- Admin (create/edit/delete/reorder) has been implemented and live-tested.
-- All temporary acceptance-test data has been removed. Verified live state
-- at the time this migration was authored:
--   - public.articles row count = 0
--   - public.article_categories contains exactly 2 rows:
--       (最新消息, news, sort_order presumably 1)
--       (知識文章, knowledge, sort_order presumably 2)
--
-- SCOPE: data migration only. Replaces the two seed categories with the
-- four approved V1 taxonomy categories. Does NOT touch schema, RLS, GRANTs,
-- Storage, triggers, or any application/admin file.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Defensive preconditions (fail loudly, do not fabricate or auto-repair)
-- ----------------------------------------------------------------------------
-- Re-verifies live state at mutation time rather than trusting the
-- previously reported row counts above. Read-only except for the
-- RAISE EXCEPTION itself — if either check fires, the transaction aborts
-- and nothing below runs.
do $$
declare
  article_count integer;
  category_count integer;
  news_count integer;
  knowledge_count integer;
begin
  select count(*) into article_count from public.articles;
  if article_count <> 0 then
    raise exception
      'Article CMS V1 016: aborting — public.articles has % row(s). Taxonomy replacement is only safe while zero Articles exist (category IDs may already be referenced). No mutation performed.',
      article_count;
  end if;

  select count(*) into category_count from public.article_categories;
  if category_count <> 2 then
    raise exception
      'Article CMS V1 016: aborting — public.article_categories has % row(s), expected exactly 2 (the verified seed taxonomy). This migration does not delete unknown/unexpected categories. No mutation performed.',
      category_count;
  end if;

  select count(*) into news_count
  from public.article_categories
  where name = '最新消息' and slug = 'news';

  select count(*) into knowledge_count
  from public.article_categories
  where name = '知識文章' and slug = 'knowledge';

  if news_count <> 1 or knowledge_count <> 1 then
    raise exception
      'Article CMS V1 016: aborting — public.article_categories does not contain exactly the expected seed rows (最新消息/news and 知識文章/knowledge). This migration does not delete unrecognized categories. No mutation performed.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Taxonomy replacement
-- ----------------------------------------------------------------------------
-- Chose DELETE + INSERT (not UPDATE + INSERT) because it is the simpler and
-- equally safe option here: the precondition above already guarantees
-- public.articles is empty, so no foreign key can reference the two seed
-- category IDs being removed, and there is no need to preserve those IDs.
-- Reusing/renaming the two existing rows in place (Option B) would save two
-- writes but adds no safety benefit and slightly complicates matching "which
-- old row becomes which new row" for no reason.
delete from public.article_categories
where (name = '最新消息' and slug = 'news')
   or (name = '知識文章' and slug = 'knowledge');

-- SEO fields (seo_title, seo_keywords, seo_description) and head_code /
-- image_url are intentionally omitted (left NULL) — no fabricated copy is
-- introduced by this migration.
insert into public.article_categories (name, slug, sort_order) values
  ('驗屋知識', 'home-inspection-guide', 1),
  ('新成屋驗屋', 'new-home-inspection', 2),
  ('中古屋驗屋', 'existing-home-inspection', 3),
  ('預售屋驗收', 'pre-sale-home-inspection', 4);

commit;

-- ============================================================================
-- Explicitly NOT done in this migration:
-- - No ALTER TABLE / CREATE TABLE / DROP TABLE / constraint / trigger change.
-- - No change to public.is_admin() or public.set_updated_at().
-- - No RLS policy change (categories_select_public and all admin write
--   policies from 012 untouched; articles_* and article_faqs_* policies
--   from 012/013/014 untouched).
-- - No GRANT/REVOKE/ALTER DEFAULT PRIVILEGES change (013/014 privilege
--   model untouched).
-- - No Storage change (article-images bucket/policies untouched).
-- - No Article row inserted, updated, or deleted (public.articles is
--   verified empty by this migration and remains untouched otherwise).
-- - No change to app/admin/**, app/blog/**, lib/site-data.ts,
--   lib/supabase/database.types.ts, components/**, package.json, or the
--   lockfile.
-- - No Case CMS table, policy, grant, storage object, or application file
--   referenced or modified.
-- - No SQL executed against Live Supabase; no Supabase MCP call made.
-- ============================================================================
