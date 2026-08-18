-- ============================================================================
-- 文章系統圖片儲存 (Article CMS image storage)
-- ============================================================================
-- Creates a public-read Storage bucket for article cover/category images.
-- Uploads/edits/deletes are restricted to admins (public.is_admin()).
-- Run AFTER 002_articles_schema.sql (it depends on public.is_admin()).
-- Idempotent and safe to re-run.
-- ============================================================================

-- 1. Bucket: public read, 8MB limit, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'article-images',
  'article-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Policies on storage.objects scoped to this bucket.
drop policy if exists "article_images_public_read" on storage.objects;
create policy "article_images_public_read" on storage.objects
  for select using (bucket_id = 'article-images');

drop policy if exists "article_images_admin_insert" on storage.objects;
create policy "article_images_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'article-images' and public.is_admin());

drop policy if exists "article_images_admin_update" on storage.objects;
create policy "article_images_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'article-images' and public.is_admin())
  with check (bucket_id = 'article-images' and public.is_admin());

drop policy if exists "article_images_admin_delete" on storage.objects;
create policy "article_images_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'article-images' and public.is_admin());
