import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Tabelas a incluir no snapshot (não expor user_roles/profiles emails se preferires)
const TABLES = [
  "profiles",
  "user_roles",
  "tasks",
  "task_assignees",
  "projects",
  "sprints",
  "roadmap_items",
  "docs",
  "ideas",
  "bugs",
  "okrs",
  "costs",
  "calendar_events",
  "event_participants",
  "meetings",
  "meeting_task_links",
  "board_meetings",
  "board_decisions",
  "branding_notes",
  "commercial_notes",
  "site_articles",
  "social_posts",
  "alerts",
  "alert_recipients",
  "activity_log",
] as const;

export const Route = createFileRoute("/api/public/db-snapshot")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = request.headers.get("authorization");
        const token = auth?.replace(/^Bearer\s+/i, "");
        const expected = process.env.SNAPSHOT_TOKEN;

        if (!expected || !token || token !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const url = new URL(request.url);
        const only = url.searchParams.get("table");
        const tables = only
          ? TABLES.filter((t) => t === only)
          : (TABLES as readonly string[]);

        const out: Record<string, unknown> = {
          generated_at: new Date().toISOString(),
          tables: {},
        };

        for (const t of tables) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data, error } = await (supabaseAdmin as any)
            .from(t)
            .select("*")
            .limit(5000);
          (out.tables as Record<string, unknown>)[t] = error
            ? { error: error.message }
            : data;
        }

        return new Response(JSON.stringify(out, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
