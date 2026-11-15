import { NextResponse } from "next/server";
import { z } from "zod";
import { logError } from "@/lib/kernel/log";
import { requireAdmin } from "@/lib/security/apiAuth";
import { isValidKonuId } from "@/lib/studyo/constants";
import { checkK006Compliance, sanitizeK006Text } from "@/lib/studyo/k006";
import { estimateSpeechSeconds } from "@/lib/studyo/phonetics";
import {
  loadSingleStudyoIssue,
  loadStudyoWorkspace,
  saveStudyoIssue,
} from "@/lib/studyo/storage";
import { getErrorMessage } from "@/lib/utils/error";
import type { StudyoFormatKey, StudyoPublishChannel, StudyoScene } from "@/types/studyo";

const FormatSchema = z.enum(["kisa_01", "kisa_02", "seri_b", "uzun"]);
const ChannelSchema = z.enum([
  "ig_reels_1",
  "ig_reels_2",
  "ig_seri_b",
  "tiktok",
  "youtube_shorts",
  "gazete_baski",
  "web_bilim",
]);

const SceneInputSchema = z.object({
  sceneNo: z.number().int().min(1).max(30),
  title: z.string().trim().min(1).max(120),
  caption: z.string().trim().min(1).max(1600),
  voiceText: z.string().trim().min(1).max(1600),
  visualCue: z.string().trim().max(300).default(""),
  flowPrompt: z.string().trim().max(800).default(""),
  mechanismBeat: z
    .enum(["ph_duvari", "maltoz_ortakligi", "arabinoksilan_jeli", "disulfit_agi"])
    .optional(),
});

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save_script"),
    konuId: z.string().refine(isValidKonuId),
    format: FormatSchema,
    scenes: z.array(SceneInputSchema).min(1).max(20),
    directorNotes: z.string().max(2000).optional(),
    autoSanitizeK006: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("approve_script"),
    konuId: z.string().refine(isValidKonuId),
    format: FormatSchema,
  }),
  z.object({
    action: z.literal("set_audio_mode"),
    konuId: z.string().refine(isValidKonuId),
    audioMode: z.enum(["voice_ducking", "pure_asmr"]),
  }),
  z.object({
    action: z.literal("toggle_channel"),
    konuId: z.string().refine(isValidKonuId),
    channel: ChannelSchema,
  }),
  z.object({
    action: z.literal("save_social"),
    konuId: z.string().refine(isValidKonuId),
    reelsCaption: z.string().max(2200),
    tiktokCaption: z.string().max(2200),
    youtubeTitle: z.string().max(160),
    youtubeDescription: z.string().max(4000),
    accompanimentCta: z.string().max(500),
  }),
  z.object({
    action: z.literal("synthesize_draft"),
    konuId: z.string().refine(isValidKonuId),
    format: FormatSchema,
    angleHint: z.string().trim().max(240).optional(),
  }),
]);

async function synthesizeWithOptionalGemini(
  title: string,
  coreMechanism: string,
  benchRule: string,
  format: StudyoFormatKey,
  angleHint?: string
): Promise<StudyoScene[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const sceneCount = format === "seri_b" ? 4 : 5;
  const prompt = [
    "Sen EkmekLab'ın bilimsel fırıncılık içerik yönetmenisin.",
    "KESİN KURAL (K006): Asla sağlık vaadi ('sağlıklı', 'şifa', 'sindirimi kolay', 'bağırsak dostu', 'probiyotik', 'kan şekeri', 'glisemik indeks', 'insülin') kullanma. Yalnızca hamurda ve taş fırında fizikokimyasal olarak ne olduğunu anlat.",
    `Konu: ${title}`,
    `Çekirdek Mekanizma: ${coreMechanism}`,
    `Tezgâh Kuralı: ${benchRule}`,
    angleHint ? `Özel Vurgu: ${angleHint}` : "",
    `Format: ${format === "seri_b" ? "Seri B Taş Fırın Günlüğü (9:16 gerçek fırın klipleri)" : "Seri A 9:16 Bilimsel Reels (35-48 saniye)"}`,
    `Tam olarak ${sceneCount} sahnelik JSON dizisi döndür: [{"title":"...","voiceText":"...","visualCue":"...","flowPrompt":"..."}]. Sadece geçerli JSON döndür.`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
          },
        }),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    const parsed = z
      .array(
        z.object({
          title: z.string().min(1),
          voiceText: z.string().min(8),
          visualCue: z.string().default(""),
          flowPrompt: z.string().default(""),
        })
      )
      .min(3)
      .max(8)
      .safeParse(JSON.parse(rawText));

    if (!parsed.success) return null;

    return parsed.data.map((item, idx) => {
      const cleanVoice = sanitizeK006Text(item.voiceText).cleaned;
      return {
        sceneNo: idx + 1,
        title: item.title.slice(0, 100),
        caption: cleanVoice,
        voiceText: cleanVoice,
        estimatedSec: estimateSpeechSeconds(cleanVoice),
        visualCue: item.visualCue.slice(0, 240),
        flowPrompt: item.flowPrompt.slice(0, 600),
      };
    });
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  try {
    const workspace = await loadStudyoWorkspace();
    return NextResponse.json(workspace);
  } catch (err: unknown) {
    logError("studyo workspace load failed", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const parsed = ActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz stüdyo isteği." },
      { status: 400 }
    );
  }

  const body = parsed.data;

  try {
    const issue = await loadSingleStudyoIssue(body.konuId);
    if (!issue) {
      return NextResponse.json({ error: "Sayı bulunamadı." }, { status: 404 });
    }

    if (body.action === "save_script") {
      const normalizedScenes: StudyoScene[] = body.scenes.map((scene, idx) => {
        const voice = body.autoSanitizeK006
          ? sanitizeK006Text(scene.voiceText).cleaned
          : scene.voiceText;
        const cap = body.autoSanitizeK006
          ? sanitizeK006Text(scene.caption).cleaned
          : scene.caption;
        return {
          sceneNo: idx + 1,
          title: scene.title,
          caption: cap,
          voiceText: voice,
          estimatedSec: estimateSpeechSeconds(voice),
          visualCue: scene.visualCue,
          flowPrompt: scene.flowPrompt,
          mechanismBeat: scene.mechanismBeat ?? issue.defaultBeat,
        };
      });

      const combined = normalizedScenes
        .map((s) => `${s.caption}\n${s.voiceText}`)
        .join("\n");
      const k006 = checkK006Compliance(combined);

      // Metin değiştiyse ilgili formatın onayı yenilenmek üzere düşürülür (K011 disiplini)
      const nextApproved = issue.approvedFormats.filter((f) => f !== body.format);

      const saved = await saveStudyoIssue({
        ...issue,
        directorNotes:
          body.directorNotes !== undefined
            ? body.directorNotes
            : issue.directorNotes,
        approvedFormats: nextApproved,
        scenes: {
          ...issue.scenes,
          [body.format]: normalizedScenes,
        },
      });

      return NextResponse.json({ issue: saved, k006 });
    }

    if (body.action === "approve_script") {
      const scenes = issue.scenes[body.format] ?? [];
      const combined = scenes.map((s) => `${s.caption}\n${s.voiceText}`).join("\n");
      const k006 = checkK006Compliance(combined);
      if (!k006.passed) {
        return NextResponse.json(
          {
            error: `K006 Sağlık Beyanı Kapısı engelledi: ${k006.violations
              .map((v) => v.term)
              .join(", ")}. Lütfen önce "K006 Arındır" butonuna basın.`,
            k006,
          },
          { status: 422 }
        );
      }

      const approvedSet = new Set<StudyoFormatKey>(issue.approvedFormats);
      approvedSet.add(body.format);
      const saved = await saveStudyoIssue({
        ...issue,
        status: issue.status === "planned" ? "in_progress" : issue.status,
        approvedFormats: [...approvedSet],
      });
      return NextResponse.json({ issue: saved, k006 });
    }

    if (body.action === "set_audio_mode") {
      const saved = await saveStudyoIssue({
        ...issue,
        audioMode: body.audioMode,
      });
      return NextResponse.json({ issue: saved });
    }

    if (body.action === "toggle_channel") {
      const set = new Set<StudyoPublishChannel>(issue.publishedChannels);
      if (set.has(body.channel)) {
        set.delete(body.channel);
      } else {
        set.add(body.channel);
      }
      const saved = await saveStudyoIssue({
        ...issue,
        publishedChannels: [...set],
      });
      return NextResponse.json({ issue: saved });
    }

    if (body.action === "save_social") {
      const k006 = checkK006Compliance(
        [
          body.reelsCaption,
          body.tiktokCaption,
          body.youtubeTitle,
          body.youtubeDescription,
          body.accompanimentCta,
        ].join("\n")
      );
      if (!k006.passed) {
        return NextResponse.json(
          {
            error: `Sosyal medya metninde K006 sağlık terimi var: ${k006.violations
              .map((v) => v.term)
              .join(", ")}`,
            k006,
          },
          { status: 422 }
        );
      }

      const saved = await saveStudyoIssue({
        ...issue,
        social: {
          reelsCaption: body.reelsCaption,
          tiktokCaption: body.tiktokCaption,
          youtubeTitle: body.youtubeTitle,
          youtubeDescription: body.youtubeDescription,
          accompanimentCta: body.accompanimentCta,
        },
      });
      return NextResponse.json({ issue: saved, k006 });
    }

    // synthesize_draft
    const aiScenes = await synthesizeWithOptionalGemini(
      issue.title,
      issue.coreMechanism,
      issue.newspaper.benchRule,
      body.format,
      body.angleHint
    );

    const fallbackLines =
      body.format === "seri_b"
        ? [
            `Taş fırın atölyemizde bugün ${issue.productName} için ${issue.subtitle.toLowerCase()} adımındayız.${body.angleHint ? ` ${body.angleHint}` : ""}`,
            issue.newspaper.benchRule,
            issue.newspaper.mythCorrection,
            `Sıcak taş tabandan çıkan somunumuz ${issue.newspaper.pairingNote} eşleşmesiyle sofraya hazır!`,
          ]
        : [
            `${issue.title} konusunda fırıncıların en sık yaptığı hatayı üç dakikada değil otuz beş saniyede çözelim!`,
            `Hamurun içindeki gerçek fizikokimya şudur: ${issue.coreMechanism}`,
            `Yanılgı net: "${issue.newspaper.mythTitle}". Gerçekte ${issue.newspaper.mythCorrection}`,
            `Tezgâh kuralı: ${issue.newspaper.benchRule}`,
            `Ölçümlerle fırıncılık için EkmekLab bilim arşivini takip edin!`,
          ];

    const generatedScenes: StudyoScene[] =
      aiScenes ??
      fallbackLines.map((line, idx) => {
        const cleaned = sanitizeK006Text(line).cleaned;
        return {
          sceneNo: idx + 1,
          title:
            idx === 0
              ? "Kanca (İlk 3 sn)"
              : idx === fallbackLines.length - 1
              ? "Tezgâh Kuralı & Kapanış"
              : `Mekanizma Adımı ${idx}`,
          caption: cleaned,
          voiceText: cleaned,
          estimatedSec: estimateSpeechSeconds(cleaned),
          visualCue:
            body.format === "seri_b"
              ? `S24 Gerçek Taş Fırın Klibi #${idx + 1}`
              : `${issue.konuId} Canlı Bilim Grafiği & Makro Doku`,
          flowPrompt:
            body.format === "seri_b"
              ? "Gerçek S24 taş fırın klibi kullanılır."
              : `9:16 vertical macro sourdough visualization for ${issue.konuId} scene ${idx + 1}, warm stone bakery lighting.`,
          mechanismBeat: issue.defaultBeat,
        };
      });

    const saved = await saveStudyoIssue({
      ...issue,
      status: issue.status === "planned" ? "in_progress" : issue.status,
      approvedFormats: issue.approvedFormats.filter((f) => f !== body.format),
      scenes: {
        ...issue.scenes,
        [body.format]: generatedScenes,
      },
    });

    return NextResponse.json({
      issue: saved,
      usedAi: Boolean(aiScenes),
    });
  } catch (err: unknown) {
    logError("studyo action failed", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
