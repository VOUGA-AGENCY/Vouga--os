import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { SupabaseSprintReadModel } from "./supabase-sprint-read-model";

describe("SupabaseSprintReadModel", () => {
  it("accepts committed Tasks without the legacy expected result", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "sprint-1",
        name: "Sprint",
        intended_result: "Entregar",
        status: "active",
        owner_member_id: "member-1",
        starts_on: "2026-07-27",
        ends_on: "2026-07-31",
        material_risks: null,
        actual_result: null,
        learning: null,
        created_at: "2026-07-27T09:00:00.000Z",
        updated_at: "2026-07-27T09:00:00.000Z",
        owner: { display_name: "Miguel" },
        sprint_tasks: [
          {
            task_id: "task-1",
            committed_at: "2026-07-27T09:00:00.000Z",
            closure_disposition: null,
            task: {
              title: "Preparar entrega",
              expected_result: null,
              status: "in_progress",
              due_at: null,
              blocked_reason: null,
              blocked_next_move: null,
              owner: { display_name: "Miguel" },
            },
          },
        ],
      },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const readModel = new SupabaseSprintReadModel({
      from,
    } as unknown as SupabaseClient);

    const sprint = await readModel.findById("sprint-1");

    expect(sprint?.tasks[0]?.expectedResult).toBeNull();
  });
});
