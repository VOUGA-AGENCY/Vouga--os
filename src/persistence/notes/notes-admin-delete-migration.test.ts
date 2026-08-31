import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("Notes Admin delete migration", () => {
  test("restricts folders, documents and stored files to Admin", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260831130000_restrict_notes_deletes_to_admin.sql"),
      "utf8",
    );

    expect(sql).toContain("note_folders_admin_delete");
    expect(sql).toContain("note_items_admin_delete");
    expect(sql).toContain("notes_files_admin_delete");
    expect(sql.match(/public\.is_admin\(auth\.uid\(\)\)/g)).toHaveLength(3);
  });
});
