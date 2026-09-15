begin;

grant update(channel) on public.contact_interactions to authenticated;

create or replace function public.update_contact_interaction(
  p_interaction_id uuid,
  p_body text,
  p_channel text default null
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cleaned_body text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  cleaned_body := btrim(coalesce(p_body, ''));

  if char_length(cleaned_body) < 1 or char_length(cleaned_body) > 12000 then
    raise exception 'Interaction message must be between 1 and 12000 characters' using errcode = '23514';
  end if;

  if p_channel is not null and p_channel not in ('email', 'linkedin', 'call') then
    raise exception 'Invalid channel' using errcode = '23514';
  end if;

  update public.contact_interactions
  set
    body = cleaned_body,
    channel = coalesce(p_channel, channel)
  where id = p_interaction_id;

  if not found then
    raise exception 'Interaction unavailable' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.update_contact_interaction(uuid, text, text) from public, anon;
grant execute on function public.update_contact_interaction(uuid, text, text) to authenticated;

commit;
