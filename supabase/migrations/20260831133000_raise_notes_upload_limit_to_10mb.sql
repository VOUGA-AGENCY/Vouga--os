begin;

alter table public.note_items
  drop constraint if exists note_items_size_bytes_check;

alter table public.note_items
  add constraint note_items_size_bytes_check
  check (size_bytes is null or size_bytes between 1 and 10485760);

update storage.buckets
set file_size_limit = 10485760
where id = 'notes-files';

commit;
