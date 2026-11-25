-- Lagos Street Culture Map — Row Level Security
-- Public: read approved places only. Inserts must be pending. Only admins update/delete.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.places enable row level security;
alter table public.routes enable row level security;
alter table public.reports enable row level security;
alter table public.admins enable row level security;

-- Places -------------------------------------------------------------------
drop policy if exists "places read approved" on public.places;
create policy "places read approved"
  on public.places for select
  to anon, authenticated
  using (status = 'approved');

drop policy if exists "places read admin" on public.places;
create policy "places read admin"
  on public.places for select
  to authenticated
  using (public.is_admin());

drop policy if exists "places insert pending" on public.places;
create policy "places insert pending"
  on public.places for insert
  to anon, authenticated
  with check (status = 'pending' and verified = false);

drop policy if exists "places update admin" on public.places;
create policy "places update admin"
  on public.places for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "places delete admin" on public.places;
create policy "places delete admin"
  on public.places for delete
  to authenticated
  using (public.is_admin());

-- Routes -------------------------------------------------------------------
drop policy if exists "routes read" on public.routes;
create policy "routes read"
  on public.routes for select
  to anon, authenticated
  using (true);

drop policy if exists "routes admin write" on public.routes;
create policy "routes admin write"
  on public.routes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Reports ------------------------------------------------------------------
drop policy if exists "reports insert" on public.reports;
create policy "reports insert"
  on public.reports for insert
  to anon, authenticated
  with check (char_length(reason) <= 500);

drop policy if exists "reports admin read" on public.reports;
create policy "reports admin read"
  on public.reports for select
  to authenticated
  using (public.is_admin());

-- Admins table: RLS on, no policies → only the service role can manage it.

-- Storage ------------------------------------------------------------------
drop policy if exists "place images public read" on storage.objects;
create policy "place images public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'place-images');

drop policy if exists "place images admin insert" on storage.objects;
create policy "place images admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'place-images' and public.is_admin());
