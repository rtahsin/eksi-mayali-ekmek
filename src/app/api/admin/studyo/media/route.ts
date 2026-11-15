import { NextResponse } from "next/server";
import { z } from "zod";
import { logError } from "@/lib/kernel/log";
import { requireAdmin } from "@/lib/security/apiAuth";
import { isValidKonuId, STUDYO_BUCKET } from "@/lib/studyo/constants";
import {
  isSafeStudyoStoragePath,
  istanbulTimestampIso,
  loadSingleStudyoIssue,
  saveStudyoIssue,
} from "@/lib/studyo/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import type { StudyoOvenClip, StudyoReadyAsset, StudyoVoiceTake } from "@/types/studyo";

const RegisterMediaSchema = z.discriminatedUnion("category", [
  z.object({
    category: z.literal("voice_take"),
    konuId: z.string().refine(isValidKonuId),
    format: z.enum(["kisa_01", "kisa_02", "seri_b", "uzun"]),
    sceneNo: z.number().int().min(1).max(99),
    storagePath: z.string().refine(isSafeStudyoStoragePath),
    mimeType: z.string().min(3).max(80),
    sizeBytes: z.number().int().positive(),
    durationSec: z.number().min(0.1).max(900),
    peakDbfs: z.number().min(-120).max(6),
    approxLufs: z.number().min(-90).max(0),
  }),
  z.object({
    category: z.literal("oven_clip"),
    konuId: z.string().refine(isValidKonuId),
    label: z.string().trim().min(1).max(120),
    storagePath: z.string().refine(isSafeStudyoStoragePath),
    mimeType: z.string().min(3).max(80),
    sizeBytes: z.number().int().positive(),
    durationSec: z.number().min(0.1).max(600).optional(),
  }),
  z.object({
    category: z.literal("ready_output"),
    konuId: z.string().refine(isValidKonuId),
    kind: z.enum(["video_9x16", "master_wav", "gazete_pdf"]),
    format: z.enum(["kisa_01", "kisa_02", "seri_b", "uzun"]),
    label: z.string().trim().min(1).max(140),
    storagePath: z.string().refine(isSafeStudyoStoragePath),
    mimeType: z.string().min(3).max(80),
    sizeBytes: z.number().int().positive(),
    durationSec: z.number().min(0.1).max(1200).optional(),
    lufs: z.number().min(-90).max(0).optional(),
    fps: z.number().int().min(24).max(120).optional(),
  }),
]);

const DeleteMediaSchema = z.object({
  konuId: z.string().refine(isValidKonuId),
  target: z.enum(["voice_take", "oven_clip", "ready_output"]),
  format: z.enum(["kisa_01", "kisa_02", "seri_b", "uzun"]).optional(),
  sceneNo: z.number().int().min(1).max(99).optional(),
  itemId: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const parsed = RegisterMediaSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz medya kayıt verisi." },
      { status: 400 }
    );
  }

  const body = parsed.data;

  try {
    const issue = await loadSingleStudyoIssue(body.konuId);
    if (!issue) {
      return NextResponse.json({ error: "Sayı bulunamadı." }, { status: 404 });
    }

    const nowIso = istanbulTimestampIso();

    if (body.category === "voice_take") {
      const take: StudyoVoiceTake = {
        sceneNo: body.sceneNo,
        format: body.format,
        storagePath: body.storagePath,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        durationSec: body.durationSec,
        peakDbfs: body.peakDbfs,
        approxLufs: body.approxLufs,
        recordedAt: nowIso,
      };
      const prevFormatMap = issue.voiceTakes[body.format] ?? {};
      const saved = await saveStudyoIssue({
        ...issue,
        status: issue.status === "planned" ? "in_progress" : issue.status,
        voiceTakes: {
          ...issue.voiceTakes,
          [body.format]: {
            ...prevFormatMap,
            [body.sceneNo]: take,
          },
        },
      });
      return NextResponse.json({ issue: saved });
    }

    if (body.category === "oven_clip") {
      const clip: StudyoOvenClip = {
        id: crypto.randomUUID(),
        slotOrder: issue.ovenClips.length + 1,
        label: body.label,
        storagePath: body.storagePath,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        durationSec: body.durationSec,
        uploadedAt: nowIso,
      };
      const saved = await saveStudyoIssue({
        ...issue,
        status: issue.status === "planned" ? "in_progress" : issue.status,
        ovenClips: [...issue.ovenClips, clip].slice(0, 12),
      });
      return NextResponse.json({ issue: saved });
    }

    const asset: StudyoReadyAsset = {
      id: crypto.randomUUID(),
      kind: body.kind,
      format: body.format,
      label: body.label,
      storagePath: body.storagePath,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      durationSec: body.durationSec,
      lufs: body.lufs,
      fps: body.fps,
      createdAt: nowIso,
    };
    const saved = await saveStudyoIssue({
      ...issue,
      status: "ready",
      readyAssets: [asset, ...issue.readyAssets].slice(0, 24),
    });
    return NextResponse.json({ issue: saved });
  } catch (err: unknown) {
    logError("studyo media register failed", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const parsed = DeleteMediaSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz silme isteği." }, { status: 400 });
  }

  const body = parsed.data;

  try {
    const issue = await loadSingleStudyoIssue(body.konuId);
    if (!issue) {
      return NextResponse.json({ error: "Sayı bulunamadı." }, { status: 404 });
    }

    let pathToRemove: string | null = null;
    let nextIssue = issue;

    if (body.target === "voice_take" && body.format && body.sceneNo) {
      const formatMap = { ...(issue.voiceTakes[body.format] ?? {}) };
      const targetTake = formatMap[body.sceneNo];
      if (targetTake) {
        pathToRemove = targetTake.storagePath;
        delete formatMap[body.sceneNo];
      }
      nextIssue = {
        ...issue,
        voiceTakes: {
          ...issue.voiceTakes,
          [body.format]: formatMap,
        },
      };
    } else if (body.target === "oven_clip" && body.itemId) {
      const found = issue.ovenClips.find((c) => c.id === body.itemId);
      if (found) pathToRemove = found.storagePath;
      nextIssue = {
        ...issue,
        ovenClips: issue.ovenClips
          .filter((c) => c.id !== body.itemId)
          .map((c, idx) => ({ ...c, slotOrder: idx + 1 })),
      };
    } else if (body.target === "ready_output" && body.itemId) {
      const found = issue.readyAssets.find((a) => a.id === body.itemId);
      if (found) pathToRemove = found.storagePath;
      nextIssue = {
        ...issue,
        readyAssets: issue.readyAssets.filter((a) => a.id !== body.itemId),
      };
    }

    const admin = createAdminClient();
    if (admin && pathToRemove && isSafeStudyoStoragePath(pathToRemove)) {
      await admin.storage.from(STUDYO_BUCKET).remove([pathToRemove]);
    }

    const saved = await saveStudyoIssue(nextIssue);
    return NextResponse.json({ issue: saved });
  } catch (err: unknown) {
    logError("studyo media delete failed", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
