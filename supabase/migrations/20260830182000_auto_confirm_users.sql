begin;

-- Function to automatically confirm email for newly created users
create or replace function public.auto_confirm_new_users()
returns trigger
language plpgsql
security definer
as $$
begin
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  new.confirmed_at := coalesce(new.confirmed_at, now());
  return new;
end;
$$;

-- Trigger to run before user insertion in auth.users
drop trigger if exists auto_confirm_new_users_trigger on auth.users;
create trigger auto_confirm_new_users_trigger
before insert on auth.users
for each row
execute function public.auto_confirm_new_users();

-- Auto-confirm any existing users who have pending email confirmations
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now()),
    confirmed_at = coalesce(confirmed_at, now())
where email_confirmed_at is null or confirmed_at is null;

commit;
