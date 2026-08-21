-- STEP 14J-A: Drop legacy specification columns from public.case_items.
--
-- specification_type and specification_description were inherited from a
-- legacy product/e-commerce style schema (see scripts/004_cases_schema.sql).
-- The Case Study CMS is display-oriented (home-inspection case studies), not
-- a product catalog, and has no use for a "specification" concept.
--
-- STEP 14H removed all application usage of these two columns (admin UI,
-- create/update/duplicate logic). STEP 14I audited the schema and confirmed
-- there is no runtime, RLS policy, GRANT, trigger, index, or public-facing
-- dependency on either column.
--
-- This migration intentionally removes ONLY these two columns. No other
-- legacy field (price, stock_quantity, is_home, etc.) is affected.
alter table public.case_items
  drop column if exists specification_type,
  drop column if exists specification_description;
