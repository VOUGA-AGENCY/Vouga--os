-- Set must_change_password to true for all users who have never signed in
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"must_change_password": true}'::jsonb
where last_sign_in_at is null;
