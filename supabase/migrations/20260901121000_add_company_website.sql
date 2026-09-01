begin;

alter table public.companies
  add column website text,
  add constraint companies_website_length_check
    check (website is null or char_length(btrim(website)) between 1 and 2048);

commit;
