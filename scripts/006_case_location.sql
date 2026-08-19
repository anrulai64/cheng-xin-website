-- ============================================================================
-- 實績案例：新增「案例地區」欄位 (Case Study location field) — STEP 12B
-- ============================================================================
-- Adds a single nullable free-text column `location` to public.case_items.
-- This is the human-readable location shown for a Case Study on the public
-- frontend (e.g. 桃園市桃園區、台北市中山區). It is intentionally a plain text
-- field — NOT normalized into another table, NO taxonomy, NO foreign key.
--
-- Safe to run multiple times (idempotent). This migration:
--   * does NOT modify scripts/004_cases_schema.sql
--   * does NOT change RLS, policies, triggers, indexes, or Storage
--   * does NOT alter any existing column
-- Existing case_items RLS policies automatically apply to the new column.
--
-- Run this in the Supabase SQL Editor (or the v0 Scripts panel) against the
-- connected project.
-- ============================================================================

alter table public.case_items
  add column if not exists location text;

comment on column public.case_items.location is
  '案例地區：人類可讀的地區文字（例如 桃園市桃園區），供公開前台顯示；可為空。';
