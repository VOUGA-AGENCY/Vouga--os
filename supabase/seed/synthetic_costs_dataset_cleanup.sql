-- SYNTHETIC B006 CONTROLLED CLEANUP
-- Removes only fixed f006 rows marked as synthetic.

begin;

do $synthetic_b006_cleanup$
begin
  if exists (
    select 1 from public.costs where id::text like 'f006%' and title not like '[SYNTHETIC B006]%'
  ) or exists (
    select 1 from public.cash_balance_snapshots
    where id::text like 'f006%' and description not like '[SYNTHETIC B006]%'
  ) then raise exception 'Cleanup stopped: f006 contains an unmarked row'; end if;

  delete from public.cost_tasks where cost_id::text like 'f006%';
  delete from public.costs where id::text like 'f006%';
  alter table public.cash_balance_snapshots disable trigger cash_balance_snapshots_append_only;
  delete from public.cash_balance_snapshots where id::text like 'f006%';
  alter table public.cash_balance_snapshots enable trigger cash_balance_snapshots_append_only;
end;
$synthetic_b006_cleanup$;

commit;
