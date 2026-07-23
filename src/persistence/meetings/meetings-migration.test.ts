import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260715230000_create_meetings.sql", import.meta.url),
  "utf8",
).toLowerCase();

const triggerFixMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260715233000_fix_meeting_member_triggers.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

const meetingKindMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260719152000_add_meeting_kind.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

describe("migration de Meetings", () => {
  it("cria Meeting, participantes e relação tipada com Companies", () => {
    expect(migration).toContain("create table public.meetings");
    expect(migration).toContain("create table public.meeting_participants");
    expect(migration).toContain("create table public.meeting_companies");
    expect(migration).toContain("meeting_participants_identity_check");
    expect(migration).not.toContain("create table public.contacts");
    expect(migration).not.toContain("create table public.relationships");
  });

  it("reforça intervalo, fecho e referências humanas", () => {
    expect(migration).toContain("meetings_interval_check");
    expect(migration).toContain("meetings_closure_check");
    expect(migration).toContain("meetings_require_active_closer");
    expect(migration).toContain("meeting_participants_require_active_member");
    expect(triggerFixMigration).toContain("create function public.require_active_meeting_closer");
    expect(triggerFixMigration).toContain(
      "create function public.require_active_meeting_participant",
    );
    expect(triggerFixMigration).toContain("drop trigger if exists");
    expect(triggerFixMigration).not.toContain("tg_table_name");
  });

  it("guarda o agregado de forma transacional sem security definer", () => {
    expect(migration).toContain("create function public.save_meeting");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("grant execute on function public.save_meeting");
  });

  it("adiciona tipo de Meeting sem reclassificar dados antigos", () => {
    expect(meetingKindMigration).toContain("add column kind text not null default 'meeting'");
    expect(meetingKindMigration).toContain("meetings_kind_check");
    expect(meetingKindMigration).toContain("kind in ('meeting', 'event')");
    expect(meetingKindMigration).toContain("create or replace function public.save_meeting");
    expect(meetingKindMigration).toContain("p_values ->> 'kind'");
    expect(meetingKindMigration).toContain("where id = p_meeting_id and status in ('planned', 'needs_closure')");
  });

  it("ativa RLS e rejeita anon nas três estruturas", () => {
    for (const table of ["meetings", "meeting_participants", "meeting_companies"]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`revoke all on table public.${table} from anon`);
    }
  });
});
