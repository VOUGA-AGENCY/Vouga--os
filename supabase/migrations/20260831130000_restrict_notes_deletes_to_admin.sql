begin;

drop policy if exists note_folders_shared_delete on public.note_folders;
create policy note_folders_admin_delete on public.note_folders
  for delete to authenticated using (public.is_admin(auth.uid()));

drop policy if exists note_items_shared_delete on public.note_items;
create policy note_items_admin_delete on public.note_items
  for delete to authenticated using (public.is_admin(auth.uid()));

drop policy if exists notes_files_shared_delete on storage.objects;
create policy notes_files_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'notes-files' and public.is_admin(auth.uid()));

commit;
