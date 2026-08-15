-- ============================================================================
-- 文章系統 (Article CMS) schema, RLS, and seed data
-- ============================================================================
-- Safe to run multiple times (idempotent). Does NOT touch existing tables,
-- authentication, or admin_users. Run this in the v0 Scripts panel (or the
-- Supabase SQL editor) against the connected project.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Admin check helper (SECURITY DEFINER so it reliably reads admin_users
--    regardless of RLS on that table). Pinned search_path for safety.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
       or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- 1. article_categories
-- ---------------------------------------------------------------------------
create table if not exists public.article_categories (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  seo_title       text,
  seo_keywords    text,
  seo_description text,
  head_code       text,
  slug            text unique,
  image_url       text,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. articles
-- ---------------------------------------------------------------------------
create table if not exists public.articles (
  id               uuid primary key default gen_random_uuid(),
  category_id      uuid references public.article_categories(id) on delete restrict,
  title            text not null,
  seo_title        text,
  seo_keywords     text,
  seo_description  text,
  head_code        text,
  slug             text,
  video_url        text,
  cover_image_url  text,
  publish_date     date not null default current_date,
  start_date       date,
  end_date         date,
  show_on_homepage boolean not null default false,
  is_pinned        boolean not null default false,
  external_url     text,
  content_html     text,
  memo             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists articles_category_id_idx on public.articles (category_id);
create index if not exists articles_publish_date_idx on public.articles (publish_date desc);
create index if not exists articles_pinned_idx on public.articles (is_pinned, publish_date desc);

-- ---------------------------------------------------------------------------
-- 3. article_related_articles (ordered many-to-many, no self-reference)
-- ---------------------------------------------------------------------------
create table if not exists public.article_related_articles (
  article_id         uuid not null references public.articles(id) on delete cascade,
  related_article_id uuid not null references public.articles(id) on delete cascade,
  sort_order         integer not null default 0,
  primary key (article_id, related_article_id),
  constraint article_related_no_self check (article_id <> related_article_id)
);

create index if not exists article_related_article_id_idx on public.article_related_articles (article_id);

-- ---------------------------------------------------------------------------
-- 4. updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_article_categories_updated_at on public.article_categories;
create trigger set_article_categories_updated_at
  before update on public.article_categories
  for each row execute function public.set_updated_at();

drop trigger if exists set_articles_updated_at on public.articles;
create trigger set_articles_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.article_categories enable row level security;
alter table public.articles enable row level security;
alter table public.article_related_articles enable row level security;

-- Categories: public may read; only admins may write.
drop policy if exists "categories_select_public" on public.article_categories;
create policy "categories_select_public" on public.article_categories
  for select using (true);

drop policy if exists "categories_admin_insert" on public.article_categories;
create policy "categories_admin_insert" on public.article_categories
  for insert to authenticated with check (public.is_admin());

drop policy if exists "categories_admin_update" on public.article_categories;
create policy "categories_admin_update" on public.article_categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "categories_admin_delete" on public.article_categories;
create policy "categories_admin_delete" on public.article_categories
  for delete to authenticated using (public.is_admin());

-- Articles: admins read everything; public reads only currently-visible ones.
drop policy if exists "articles_select_admin" on public.articles;
create policy "articles_select_admin" on public.articles
  for select to authenticated using (public.is_admin());

drop policy if exists "articles_select_public" on public.articles;
create policy "articles_select_public" on public.articles
  for select using (
    publish_date <= current_date
    and (start_date is null or start_date <= current_date)
    and (end_date is null or end_date >= current_date)
  );

drop policy if exists "articles_admin_insert" on public.articles;
create policy "articles_admin_insert" on public.articles
  for insert to authenticated with check (public.is_admin());

drop policy if exists "articles_admin_update" on public.articles;
create policy "articles_admin_update" on public.articles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "articles_admin_delete" on public.articles;
create policy "articles_admin_delete" on public.articles
  for delete to authenticated using (public.is_admin());

-- Related-article links: public may read; only admins may write.
drop policy if exists "article_related_select_public" on public.article_related_articles;
create policy "article_related_select_public" on public.article_related_articles
  for select using (true);

drop policy if exists "article_related_admin_insert" on public.article_related_articles;
create policy "article_related_admin_insert" on public.article_related_articles
  for insert to authenticated with check (public.is_admin());

drop policy if exists "article_related_admin_update" on public.article_related_articles;
create policy "article_related_admin_update" on public.article_related_articles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "article_related_admin_delete" on public.article_related_articles;
create policy "article_related_admin_delete" on public.article_related_articles
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. Seed default categories (only if the table is empty)
-- ---------------------------------------------------------------------------
insert into public.article_categories (name, slug, sort_order)
select v.name, v.slug, v.sort_order
from (values
  ('最新消息', 'news', 1),
  ('知識文章', 'knowledge', 2)
) as v(name, slug, sort_order)
where not exists (select 1 from public.article_categories);
