-- Admin authentication: allow an authenticated user to read ONLY their own
-- admin_users row. Without a SELECT policy, RLS returns no rows and every
-- real admin is rejected as "not authorized" after a successful login.
--
-- Safe to run multiple times.

-- 1. Ensure RLS is enabled (defense in depth; the table should already have it).
alter table public.admin_users enable row level security;

-- 2. SELECT: a signed-in user may read only their OWN admin_users row,
--    identified either by auth user id or by their verified email. Matching on
--    email keeps login working when the row's user_id was set before the auth
--    account existed. A user still cannot read any other admin's row.
drop policy if exists "admin_users_select_own" on public.admin_users;
create policy "admin_users_select_own"
  on public.admin_users
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or lower(email) = lower(auth.jwt() ->> 'email')
  );

-- NOTE: We intentionally do NOT add INSERT/UPDATE/DELETE policies.
-- Admin rows are provisioned out-of-band (SQL editor / service role), so the
-- authenticated role has no write access to this table. This prevents a
-- logged-in user from granting themselves admin.
