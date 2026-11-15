import { describe, expect, it } from "vitest";
import { evaluateDirectorCoach, verifySafeZoneMargins } from "./coach";
import { checkK006Compliance, sanitizeK006Text } from "./k006";
import { extractPhoneticGuides } from "./phonetics";
import { buildInitialStudyoCatalog } from "./seed";
import { buildStudyoUploadSpec, isSafeStudyoStoragePath } from "./storage";
import {
  decodeWavToMonoFloat32,
  encodeMonoWav16,
  measureMonoSamples,
  stitchSceneTakesToMasterWav,
  STUDYO_SAMPLE_RATE,
} from "./wav";

describe("EkmekLab Bulut Stüdyo Çekirdek Mantığı", () => {
  it("25 sayının tamamını (Sayı #01–#25) eksiksiz ve %100 K006 uyumlu olarak üretir", () => {
    const issues = buildInitialStudyoCatalog();
    expect(issues).toHaveLength(25);

    const numbers = issues.map((i) => i.issueNumber);
    expect(numbers).toEqual(Array.from({ length: 25 }, (_, idx) => idx + 1));

    for (const issue of issues) {
      expect(issue.scenes.kisa_01.length).toBeGreaterThanOrEqual(4);
      expect(issue.scenes.kisa_02.length).toBeGreaterThanOrEqual(4);
      expect(issue.scenes.seri_b.length).toBeGreaterThanOrEqual(4);

      const corpus = [
        issue.title,
        issue.subtitle,
        issue.coreMechanism,
        issue.bookSummary,
        issue.newspaper.headline,
        issue.newspaper.leadFact,
        issue.newspaper.benchRule,
        issue.newspaper.mythCorrection,
        issue.social.reelsCaption,
        issue.social.youtubeDescription,
        ...issue.scenes.kisa_01.map((s) => `${s.caption} ${s.voiceText}`),
        ...issue.scenes.kisa_02.map((s) => `${s.caption} ${s.voiceText}`),
        ...issue.scenes.seri_b.map((s) => `${s.caption} ${s.voiceText}`),
      ].join("\n");

      const report = checkK006Compliance(corpus);
      expect(
        report.violations,
        `${issue.konuId} K006 ihlali içeriyor: ${JSON.stringify(report.violations)}`
      ).toHaveLength(0);
    }
  });

  it("K006 Türkçe büyük/küçük harf duyarlı sağlık beyanlarını yakalar ve tek tıkla fizikokimyasal dile çevirir", () => {
    const dirty =
      "Bu ekşi mayalı ekmek SİNDİRİMİ KOLAYLAŞTIRIR, bağırsak dostu probiyotik etkisiyle ŞİFA verir ve kan şekerini dengeler.";
    const report = checkK006Compliance(dirty);
    expect(report.passed).toBe(false);
    expect(report.violationCount).toBeGreaterThanOrEqual(5);

    const { cleaned, replacedCount } = sanitizeK006Text(dirty);
    expect(replacedCount).toBeGreaterThanOrEqual(5);
    expect(checkK006Compliance(cleaned).passed).toBe(true);

    // Fiziksel fırıncılık ifadeleri yanlış pozitif üretmemeli
    const cleanPhysics =
      "Bakteri asit dengesini korur; ilk iki dakikadaki yoğun buhar kabuğun erken kurumasını önler.";
    expect(checkK006Compliance(cleanPhysics).passed).toBe(true);
  });

  it("Latince ve bilimsel terimler için doğru Türkçe okunuş rehberini çıkarır", () => {
    const guides = extractPhoneticGuides(
      "Weissella ve Fructilactobacillus sanfranciscensis ile Kazachstania humilis pKa sınırında buluşur."
    );
    const terms = guides.map((g) => g.term);
    expect(terms).toContain("Weissella");
    expect(terms).toContain("F. sanfranciscensis");
    expect(terms).toContain("Kazachstania humilis");
    expect(terms).toContain("pKa");
  });

  it("0–100 Yönetmen Koçu ve 9:16 Safe-Zone sınırlarını (alt >= 422px, sağ >= 152px) doğrular", () => {
    const issue01 = buildInitialStudyoCatalog()[0]!;
    const coach = evaluateDirectorCoach(issue01.scenes.kisa_01, "kisa_01", 436, 156);
    expect(coach.safeZonePassed).toBe(true);
    expect(coach.totalScore).toBeGreaterThanOrEqual(80);

    const badSafeZone = verifySafeZoneMargins(320, 100);
    expect(badSafeZone.passed).toBe(false);
  });

  it("48 kHz 16-bit WAV kodlar, çözer ve Punch-In sahnelerini -14 LUFS / -1.5 dBTP tavanıyla birleştirir", () => {
    const len = STUDYO_SAMPLE_RATE; // 1.0 sn
    const scene1 = new Float32Array(len);
    const scene2 = new Float32Array(len);
    for (let i = 0; i < len; i += 1) {
      scene1[i] = 0.08 * Math.sin((2 * Math.PI * 220 * i) / STUDYO_SAMPLE_RATE);
      scene2[i] = 0.25 * Math.sin((2 * Math.PI * 330 * i) / STUDYO_SAMPLE_RATE);
    }

    const { wavBuffer, stats } = stitchSceneTakesToMasterWav(
      [
        { samples: scene1, sampleRate: STUDYO_SAMPLE_RATE },
        { samples: scene2, sampleRate: STUDYO_SAMPLE_RATE },
      ],
      180
    );

    expect(wavBuffer.byteLength).toBeGreaterThan(44 + STUDYO_SAMPLE_RATE * 2);
    expect(stats.peakDbfs).toBeLessThanOrEqual(-1.4);
    expect(stats.approxLufs).toBeGreaterThan(-18);
    expect(stats.approxLufs).toBeLessThan(-10);

    const decoded = decodeWavToMonoFloat32(wavBuffer);
    expect(decoded.sampleRate).toBe(STUDYO_SAMPLE_RATE);
    const reStats = measureMonoSamples(decoded.samples, decoded.sampleRate);
    expect(Math.abs(reStats.durationSec - stats.durationSec)).toBeLessThan(0.05);

    const singleBuf = encodeMonoWav16(scene1, STUDYO_SAMPLE_RATE);
    expect(decodeWavToMonoFloat32(singleBuf).samples.length).toBe(len);
  });

  it("Bulut depolama yükleme yollarında dizin aşımını ve geçersiz MIME tiplerini reddeder", () => {
    expect(isSafeStudyoStoragePath("voice/KONU-01/kisa_01/sahne_01_abc.wav")).toBe(true);
    expect(isSafeStudyoStoragePath("../products/hack.jpg")).toBe(false);
    expect(isSafeStudyoStoragePath("/absolute/path.wav")).toBe(false);

    const okVoice = buildStudyoUploadSpec({
      category: "voice_take",
      konuId: "KONU-01",
      format: "kisa_01",
      sceneNo: 3,
      mimeType: "audio/wav",
      sizeBytes: 512_000,
      uid: "test123",
    });
    expect(okVoice).toEqual({
      ok: true,
      path: "voice/KONU-01/kisa_01/sahne_03_test123.wav",
    });

    const badMime = buildStudyoUploadSpec({
      category: "oven_clip",
      konuId: "KONU-01",
      format: "seri_b",
      mimeType: "application/x-msdownload",
      sizeBytes: 1024,
    });
    expect(badMime.ok).toBe(false);
  });
});
