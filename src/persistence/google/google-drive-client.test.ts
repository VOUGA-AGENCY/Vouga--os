import { describe, expect, test, vi } from "vitest";

import { GoogleDriveClient } from "./google-drive-client";

describe("GoogleDriveClient", () => {
  test("lista apenas Google Docs acessíveis à app", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          files: [
            {
              createdTime: "2026-07-20T10:00:00.000Z",
              id: "doc-1",
              mimeType: "application/vnd.google-apps.document",
              modifiedTime: "2026-07-23T12:00:00.000Z",
              name: "Pitch notes",
              webViewLink: "https://docs.google.com/document/d/doc-1/edit",
            },
            {
              id: "sheet-1",
              mimeType: "application/vnd.google-apps.spreadsheet",
              name: "Finance",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const client = new GoogleDriveClient(fetcher);

    await expect(client.listDocuments("access-token", "Pitch")).resolves.toEqual([
      {
        createdAt: "2026-07-20T10:00:00.000Z",
        htmlLink: "https://docs.google.com/document/d/doc-1/edit",
        id: "doc-1",
        modifiedAt: "2026-07-23T12:00:00.000Z",
        title: "Pitch notes",
      },
    ]);
    const url = fetcher.mock.calls[0]?.[0] as URL;
    expect(url.searchParams.get("q")).toBe(
      "mimeType = 'application/vnd.google-apps.document' and trashed = false and name contains 'Pitch'",
    );
    expect(url.searchParams.get("orderBy")).toBe("modifiedTime desc");
  });

  test("escapa pesquisa Drive e cria Google Doc nativo", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ files: [] }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "doc-2",
            mimeType: "application/vnd.google-apps.document",
            name: "Founder doc",
          }),
          { status: 200 },
        ),
      );
    const client = new GoogleDriveClient(fetcher);

    await client.listDocuments("access-token", "Ana's \\ doc");
    expect((fetcher.mock.calls[0]?.[0] as URL).searchParams.get("q")).toContain(
      "name contains 'Ana\\'s \\\\ doc'",
    );

    await expect(client.createDocument("access-token", "Founder doc")).resolves.toEqual({
      createdAt: null,
      htmlLink: "https://docs.google.com/document/d/doc-2/edit",
      id: "doc-2",
      modifiedAt: null,
      title: "Founder doc",
    });
    const body = JSON.parse(fetcher.mock.calls[1]?.[1]?.body as string);
    expect(body).toEqual({
      mimeType: "application/vnd.google-apps.document",
      name: "Founder doc",
    });
  });
});
