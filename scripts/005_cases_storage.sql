-- ============================================================================
-- 實績案例圖片儲存 (Case Study CMS image storage) — STEP 1B
-- ============================================================================
-- Creates a public-read Storage bucket for Case Study CMS images (case items
-- and case categories). Uploads/edits/deletes are restricted to admins via the
-- EXISTING public.is_admin() helper (created in 002_articles_schema.sql — this
-- script only references it, never redefines it).
--
-- Path conventions (enforced by application code, not by these policies):
--   case-items/{case_id}/{filename}
--   case-categories/{category_id}/{filename}
--
-- This is a NEW, separate bucket. It does NOT touch the existing
-- 'article-images' bucket or the Article CMS in any way.
-- Run AFTER 004_cases_schema.sql. Idempotent and safe to re-run.
-- ============================================================================

-- 1. Bucket: public read, 8MB per-file limit, image MIME types only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'case-images',
  'case-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Policies on storage.objects scoped to the 'case-images' bucket.
--    Uniquely named so they never collide with the article-images policies.

-- Public visitors may read/download files from this bucket.
drop policy if exists "case_images_public_read" on storage.objects;
create policy "case_images_public_read" on storage.objects
  for select using (bucket_id = 'case-images');

-- Admins may upload.
drop policy if exists "case_images_admin_insert" on storage.objects;
create policy "case_images_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'case-images' and public.is_admin());

-- Admins may replace/rename/move within the bucket.
drop policy if exists "case_images_admin_update" on storage.objects;
create policy "case_images_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'case-images' and public.is_admin())
  with check (bucket_id = 'case-images' and public.is_admin());

-- Admins may delete.
drop policy if exists "case_images_admin_delete" on storage.objects;
create policy "case_images_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'case-images' and public.is_admin());
