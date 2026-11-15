import { NextResponse } from "next/server";
import { z } from "zod";
import { logError } from "@/lib/kernel/log";
import { requireAdmin } from "@/lib/security/apiAuth";
import { verifySafeZoneMargins } from "@/lib/studyo/coach";
import {
  DEFAULT_SAFE_ZONE_BOTTOM_PX,
  DEFAULT_SAFE_ZONE_RIGHT_PX,
  isValidKonuId,
} from "@/lib/studyo/constants";
import { checkK006Compliance } from "@/lib/studyo/k006";
import {
  appendStudyoRenderJob,
  istanbulTimestampIso,
  loadSingleStudyoIssue,
  saveStudyoIssue,
} from "@/lib/studyo/storage";
import { getErrorMessage } from "@/lib/utils/error";
import type { StudyoRenderJob } from "@/types/studyo";

const RenderRequestSchema = z.object({
  konuId: z.string().refine(isValidKonuId),
  format: z.enum(["kisa_01", "kisa_02", "seri_b", "uzun"]),
  safeZoneBottomPx: z.number().int().min(0).max(900).default(DEFAULT_SAFE_ZONE_BOTTOM_PX),
  safeZoneRightPx: z.number().int().min(0).max(500).default(DEFAULT_SAFE_ZONE_RIGHT_PX),
});

async function triggerGithubCloudRender(job: StudyoRenderJob): Promise<boolean> {
  const pat = process.env.GITHUB_RENDER_PAT;
  const repoSlug = process.env.GITHUB_REPO_SLUG || "rtahsin/eksi-mayali-ekmek";
  if (!pat || !/^[\w.-]+\/[\w.-]+$/.test(repoSlug)) {
    return false;
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repoSlug}/actions/workflows/studyo-bulut-render.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            job_id: job.id,
            konu_id: job.konuId,
            format: job.format,
          },
        }),
      }
    );
    return res.status === 204 || res.ok;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const parsed = RenderRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz render isteği." },
      { status: 400 }
    );
  }

  const { konuId, format, safeZoneBottomPx, safeZoneRightPx } = parsed.data;

  try {
    const issue = await loadSingleStudyoIssue(konuId);
    if (!issue) {
      return NextResponse.json({ error: "Sayı bulunamadı." }, { status: 404 });
    }

    const scenes = issue.scenes[format] ?? [];
    if (scenes.length === 0) {
      return NextResponse.json(
        { error: "Seçili formatta sahne bulunmuyor." },
        { status: 422 }
      );
    }

    // Sert Kalite Kapısı 1: K006 Sıfır Sağlık Beyanı
    const combinedText = scenes
      .map((s) => `${s.caption}\n${s.voiceText}`)
      .join("\n");
    const k006 = checkK006Compliance(combinedText);
    if (!k006.passed) {
      return NextResponse.json(
        {
          error: `K006 Sert Kapı Engeli: ${k006.violations
            .map((v) => v.term)
            .join(", ")}. Lütfen önce metni K006 Arındır ile temizleyin.`,
          k006,
        },
        { status: 422 }
      );
    }

    // Sert Kalite Kapısı 2: 9:16 Safe-Zone
    const safeZone = verifySafeZoneMargins(safeZoneBottomPx, safeZoneRightPx);
    if (!safeZone.passed) {
      return NextResponse.json({ error: safeZone.detail }, { status: 422 });
    }

    const nowIso = istanbulTimestampIso();
    const series = format === "seri_b" ? "seri_b_firin" : "seri_a_bilim";

    const job: StudyoRenderJob = {
      id: crypto.randomUUID(),
      konuId,
      format,
      series,
      audioMode: issue.audioMode,
      fps: 60,
      width: 1080,
      height: 1920,
      safeZoneBottomPx,
      safeZoneRightPx,
      status: "queued",
      workerTarget: "cloud_or_local",
      statusMessage: "Bulut kuyruğuna alındı (60 fps H.264 · -14 LUFS).",
      outputPath: null,
      outputSignedUrl: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const hasCloudPat = Boolean(process.env.GITHUB_RENDER_PAT);
    if (hasCloudPat) {
      job.workerTarget = "github_actions";
      job.statusMessage =
        "GitHub Actions bulut işçisi kuyruğa alındı (60 fps H.264 · -14 LUFS).";
    }

    await saveStudyoIssue(issue);
    const queue = await appendStudyoRenderJob(job);
    const dispatched = hasCloudPat ? await triggerGithubCloudRender(job) : false;
    return NextResponse.json({ job, queue, dispatched });
  } catch (err: unknown) {
    logError("studyo render queue failed", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
