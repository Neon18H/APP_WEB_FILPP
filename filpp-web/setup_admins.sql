-- setup_admins.sql
-- Crea y protege admins, clients y el bucket 'client_docs' (privado).

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  created_at timestamptz default now()
);
alter table public.admins enable row level security;
create policy if not exists "admin can read self"
on public.admins for select to authenticated using (auth.uid() = user_id);
create policy if not exists "admin can insert self"
on public.admins for insert to authenticated with check (auth.uid() = user_id);

alter table public.clients enable row level security;
create policy if not exists "Admins can read clients"
on public.clients for select to authenticated using (exists(select 1 from public.admins a where a.user_id = auth.uid()));
create policy if not exists "Admins can insert clients"
on public.clients for insert to authenticated with check (exists(select 1 from public.admins a where a.user_id = auth.uid()));
create policy if not exists "Admins can update clients"
on public.clients for update to authenticated using (exists(select 1 from public.admins a where a.user_id = auth.uid())) with check (exists(select 1 from public.admins a where a.user_id = auth.uid()));
create policy if not exists "Admins can delete clients"
on public.clients for delete to authenticated using (exists(select 1 from public.admins a where a.user_id = auth.uid()));

-- Bucket en Storage: client_docs (no público)
create policy "Admins can read client_docs"
on storage.objects for select to authenticated
using (bucket_id = 'client_docs' and exists(select 1 from public.admins a where a.user_id = auth.uid()));
create policy  "Admins can upload to client_docs"
on storage.objects for insert to authenticated
with check (bucket_id = 'client_docs' and exists(select 1 from public.admins a where a.user_id = auth.uid()));
create policy  "Admins can update client_docs"
on storage.objects for update to authenticated
using (bucket_id = 'client_docs' and exists(select 1 from public.admins a where a.user_id = auth.uid()))
with check (bucket_id = 'client_docs' and exists(select 1 from public.admins a where a.user_id = auth.uid()));
create policy  "Admins can delete client_docs"
on storage.objects for delete to authenticated
using (bucket_id = 'client_docs' and exists(select 1 from public.admins a where a.user_id = auth.uid()));
