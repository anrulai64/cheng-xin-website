-- ============================================================================
-- 實績案例：新增「案例基本資料」欄位 (Case basic-information fields) — STEP 12G
-- ============================================================================
-- Adds four nullable free-text columns to public.case_items for the public
-- Case Study 案例基本資料 section used by the inspection business:
--
--   property_type       類別   (e.g. 社區大樓 / 透天住宅 / 華廈)
--   property_condition  屋況   (e.g. 新成屋 / 中古屋 / 預售屋交屋)
--   floor_area          坪數   (e.g. 14坪 / 約 28 坪 / 36.5坪)
--   layout              格局   (e.g. 一廳一衛一臥一陽 / 3房2廳2衛)
--
-- 所在地 reuses the EXISTING `location` column (scripts/006_case_location.sql);
-- no new location column is added here.
--
-- These are intentionally flexible, human-readable TEXT fields:
--   * NOT normalized into lookup tables
--   * NO enums, NO foreign keys, NO taxonomy
--   * floor_area is NOT parsed into a number
--   * layout is NOT forced into a standardized structure
-- Values are stored as trimmed text exactly as entered.
--
-- Safe to run multiple times (idempotent) via ADD COLUMN IF NOT EXISTS. This
-- migration:
--   * does NOT modify any existing migration
--   * does NOT alter existing columns
--   * does NOT change RLS, policies, triggers, indexes, or Storage
--   * does NOT touch public.is_admin() or Auth
-- Existing case_items RLS policies automatically apply to the new columns.
--
-- Run this in the Supabase SQL Editor (or the v0 Scripts panel) against the
-- connected project.
-- ============================================================================

alter table public.case_items
  add column if not exists property_type text,
  add column if not exists property_condition text,
  add column if not exists floor_area text,
  add column if not exists layout text;

comment on column public.case_items.property_type is
  '案例基本資料—類別：人類可讀文字（例如 社區大樓），供公開前台顯示；可為空。';
comment on column public.case_items.property_condition is
  '案例基本資料—屋況：人類可讀文字（例如 新成屋），供公開前台顯示；可為空。';
comment on column public.case_items.floor_area is
  '案例基本資料—坪數：人類可讀文字（例如 14坪），不做數值解析；可為空。';
comment on column public.case_items.layout is
  '案例基本資料—格局：人類可讀文字（例如 一廳一衛一臥一陽），不做結構化；可為空。';
