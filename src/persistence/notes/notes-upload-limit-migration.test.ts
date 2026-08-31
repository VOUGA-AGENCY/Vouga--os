import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { NOTE_UPLOAD_MAX_BYTES } from "@/domain/notes/note";

describe("Notes upload limit migration", () => {
  test("keeps the database and Storage limit aligned with the domain", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260831133000_raise_notes_upload_limit_to_10mb.sql"),
      "utf8",
    );

    expect(NOTE_UPLOAD_MAX_BYTES).toBe(10_485_760);
    expect(sql.match(/10485760/g)).toHaveLength(2);
    expect(sql).toContain("note_items_size_bytes_check");
    expect(sql).toContain("file_size_limit");
  });
});
