import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildInitialStudyoCatalog } from "@/lib/studyo/seed";
import type { StudyoIssue } from "@/types/studyo";

const requireAdminMock = vi.fn();
const loadSingleStudyoIssueMock = vi.fn<(konuId: string) => Promise<StudyoIssue | null>>();
const saveStudyoIssueMock = vi.fn().mockResolvedValue(undefined);
const appendStudyoRenderJobMock = vi.fn().mockImplementation(async (job) => [job]);

vi.mock("@/lib/security/apiAuth", () => ({
  requireAdmin: (...args: unknown[]) => requireAdminMock(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/studyo/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/studyo/storage")>();
  return {
    ...actual,
    loadSingleStudyoIssue: (konuId: string) => loadSingleStudyoIssueMock(konuId),
    saveStudyoIssue: (...args: unknown[]) => saveStudyoIssueMock(...args),
    appendStudyoRenderJob: (...args: unknown[]) => appendStudyoRenderJobMock(...args),
  };
});

import { GET as getWorkspace } from "./route";
import { POST as postRender } from "./render/route";
import { POST as postUploadUrl } from "./upload-url/route";

describe("/api/admin/studyo security & quality gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({
      ok: true,
      user: { id: "admin-1", role: "admin" },
    });
    const seed01 =
      buildInitialStudyoCatalog().find((i) => i.konuId === "KONU-01") ?? null;
    loadSingleStudyoIssueMock.mockResolvedValue(
      seed01 ? structuredClone(seed01) : null
    );
  });

  it("blocks unauthenticated requests on GET /api/admin/studyo", async () => {
    requireAdminMock.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "Yetkisiz" }, { status: 401 }),
    });

    const req = new Request("http://localhost:3000/api/admin/studyo");
    const res = await getWorkspace(req);
    expect(res.status).toBe(401);
  });

  it("returns 25 seeded issues on GET /api/admin/studyo when authenticated", async () => {
    const req = new Request("http://localhost:3000/api/admin/studyo");
    const res = await getWorkspace(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { issues: StudyoIssue[]; storageReady: boolean };
    expect(json.issues).toHaveLength(25);
    expect(json.issues[0]?.konuId).toBe("KONU-01");
  });

  it("rejects render when K006 health claim exists in scene text", async () => {
    const dirtyIssue = structuredClone(
      buildInitialStudyoCatalog().find((i) => i.konuId === "KONU-01")!
    );
    dirtyIssue.scenes.kisa_01[0]!.voiceText =
      "Bu ekşi mayalı ekmek şifa kaynağıdır ve bağırsak dostudur.";
    loadSingleStudyoIssueMock.mockResolvedValueOnce(dirtyIssue);

    const req = new Request("http://localhost:3000/api/admin/studyo/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        konuId: "KONU-01",
        format: "kisa_01",
        safeZoneBottomPx: 440,
        safeZoneRightPx: 160,
      }),
    });

    const res = await postRender(req);
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("K006");
  });

  it("rejects render when 9:16 safe-zone margins are violated", async () => {
    const req = new Request("http://localhost:3000/api/admin/studyo/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        konuId: "KONU-01",
        format: "kisa_01",
        safeZoneBottomPx: 200,
        safeZoneRightPx: 90,
      }),
    });

    const res = await postRender(req);
    expect(res.status).toBe(422);
  });

  it("queues a valid 60 fps 9:16 render job when K006 and safe-zone pass", async () => {
    const req = new Request("http://localhost:3000/api/admin/studyo/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        konuId: "KONU-01",
        format: "kisa_01",
        safeZoneBottomPx: 440,
        safeZoneRightPx: 160,
      }),
    });

    const res = await postRender(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      job: { fps: number; width: number; height: number; status: string };
    };
    expect(body.job.fps).toBe(60);
    expect(body.job.width).toBe(1080);
    expect(body.job.height).toBe(1920);
    expect(body.job.status).toBe("queued");
    expect(saveStudyoIssueMock).toHaveBeenCalledTimes(1);
  });

  it("rejects oversized (>50MB) video upload-url requests with 400", async () => {
    const req = new Request("http://localhost:3000/api/admin/studyo/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "oven_clip",
        konuId: "KONU-01",
        format: "seri_b",
        mimeType: "video/mp4",
        sizeBytes: 55 * 1024 * 1024,
      }),
    });

    const res = await postUploadUrl(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("50 MB");
  });
});
