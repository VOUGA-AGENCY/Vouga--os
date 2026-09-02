begin;

-- Function to automatically confirm email ONLY for internal accounts created by Vouga
-- Restricts auto-confirmation strictly to official @vouga-agency.pt emails
create or replace function public.auto_confirm_new_users()
returns trigger
language plpgsql
security definer
as $$
begin
  if (new.email ilike '%@vouga-agency.pt') then
    new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  end if;
  return new;
end;
$$;

-- Trigger to run before user insertion in auth.users
drop trigger if exists auto_confirm_new_users_trigger on auth.users;
create trigger auto_confirm_new_users_trigger
before insert on auth.users
for each row
execute function public.auto_confirm_new_users();

-- Auto-confirm only existing internal Vouga accounts with pending email confirmation
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where (
    email ilike '%@vouga-agency.pt'
  )
  and email_confirmed_at is null;

commit;
