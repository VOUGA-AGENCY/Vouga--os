begin;

alter table public.companies
  add column primary_cae text,
  add column contact_email text,
  add column contact_phone text,
  add constraint companies_primary_cae_length_check
    check (primary_cae is null or char_length(btrim(primary_cae)) between 1 and 20),
  add constraint companies_contact_email_length_check
    check (contact_email is null or char_length(btrim(contact_email)) between 3 and 320),
  add constraint companies_contact_phone_length_check
    check (contact_phone is null or char_length(btrim(contact_phone)) between 1 and 40);

commit;
