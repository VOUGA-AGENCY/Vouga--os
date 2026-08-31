begin;

create table public.note_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  color text not null default 'amber' check (color in ('amber','blue','green','rose','violet','graphite')),
  created_by_member_id uuid not null references public.members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.note_items (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.note_folders(id) on delete set null,
  kind text not null check (kind in ('os_note','google_doc','upload')),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  body text,
  google_document_id text unique,
  google_html_link text,
  google_owner_member_id uuid references public.members(id),
  google_revision_id text,
  google_modified_at timestamptz,
  storage_path text unique,
  original_file_name text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes between 1 and 4194304),
  version integer not null default 1 check (version > 0),
  created_by_member_id uuid not null references public.members(id),
  updated_by_member_id uuid not null references public.members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint note_items_kind_payload_check check (
    (kind = 'os_note' and body is not null and google_document_id is null and storage_path is null)
    or
    (kind = 'google_doc' and body is not null and google_document_id is not null and google_html_link is not null and google_owner_member_id is not null and storage_path is null)
    or
    (kind = 'upload' and body is null and google_document_id is null and storage_path is not null and original_file_name is not null and mime_type is not null and size_bytes is not null)
  )
);

create index note_items_folder_updated_idx on public.note_items(folder_id, updated_at desc);
create index note_items_kind_updated_idx on public.note_items(kind, updated_at desc);

alter table public.note_folders enable row level security;
alter table public.note_items enable row level security;

create or replace function public.is_active_member(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.members where id = p_user_id and is_active = true);
$$;

create policy note_folders_shared_select on public.note_folders for select to authenticated
  using (public.is_active_member(auth.uid()));
create policy note_folders_shared_insert on public.note_folders for insert to authenticated
  with check (public.is_active_member(auth.uid()) and created_by_member_id = auth.uid());
create policy note_folders_shared_update on public.note_folders for update to authenticated
  using (public.is_active_member(auth.uid())) with check (public.is_active_member(auth.uid()));
create policy note_folders_shared_delete on public.note_folders for delete to authenticated
  using (public.is_active_member(auth.uid()));

create policy note_items_shared_select on public.note_items for select to authenticated
  using (public.is_active_member(auth.uid()));
create policy note_items_shared_insert on public.note_items for insert to authenticated
  with check (
    public.is_active_member(auth.uid())
    and created_by_member_id = auth.uid()
    and updated_by_member_id = auth.uid()
    and (kind <> 'google_doc' or public.is_admin(auth.uid()))
  );
create policy note_items_shared_update on public.note_items for update to authenticated
  using (public.is_active_member(auth.uid()) and (kind <> 'google_doc' or public.is_admin(auth.uid())))
  with check (
    public.is_active_member(auth.uid())
    and updated_by_member_id = auth.uid()
    and (kind <> 'google_doc' or public.is_admin(auth.uid()))
  );
create policy note_items_shared_delete on public.note_items for delete to authenticated
  using (public.is_active_member(auth.uid()) and (kind <> 'google_doc' or public.is_admin(auth.uid())));

revoke all on table public.note_folders from anon;
revoke all on table public.note_items from anon;
grant select, insert, update, delete on table public.note_folders to authenticated;
grant select, insert, update, delete on table public.note_items to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'notes-files', 'notes-files', false, 4194304,
  array[
    'application/pdf', 'image/png', 'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy notes_files_shared_select on storage.objects for select to authenticated
  using (bucket_id = 'notes-files' and public.is_active_member(auth.uid()));
create policy notes_files_shared_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'notes-files' and public.is_active_member(auth.uid()));
create policy notes_files_shared_update on storage.objects for update to authenticated
  using (bucket_id = 'notes-files' and public.is_active_member(auth.uid()))
  with check (bucket_id = 'notes-files' and public.is_active_member(auth.uid()));
create policy notes_files_shared_delete on storage.objects for delete to authenticated
  using (bucket_id = 'notes-files' and public.is_active_member(auth.uid()));

commit;
