import { describe, expect, it, vi, afterEach } from "vitest";
import {
  GENERIC_PHOTO_DECODE_ERROR_MESSAGE,
  HEIC_DECODE_ERROR_MESSAGE,
  getPhotoDecodeErrorMessage,
  isHeicLikeFile,
  shrinkPhoto,
} from "./shrinkPhoto";

describe("shrinkPhoto pure helpers", () => {
  it("detects HEIC and HEIF files by extension regardless of case or empty MIME type", () => {
    expect(isHeicLikeFile({ name: "20261114_081500.heic", type: "" })).toBe(true);
    expect(isHeicLikeFile({ name: "SAM_0042.HEIF", type: "application/octet-stream" })).toBe(true);
    expect(isHeicLikeFile({ name: "yogurt.HeIc", type: "" })).toBe(true);
  });

  it("detects HEIC and HEIF files by MIME type even without extension", () => {
    expect(isHeicLikeFile({ name: "upload", type: "image/heic" })).toBe(true);
    expect(isHeicLikeFile({ name: "upload", type: "IMAGE/HEIF" })).toBe(true);
    expect(isHeicLikeFile({ name: "burst", type: "image/heic-sequence" })).toBe(true);
    expect(isHeicLikeFile({ name: "burst", type: "image/heif-sequence" })).toBe(true);
  });

  it("returns false for standard browser-supported formats (.jpg, .png, image/webp)", () => {
    expect(isHeicLikeFile({ name: "koy-yogurdu.jpg", type: "image/jpeg" })).toBe(false);
    expect(isHeicLikeFile({ name: "jersey-sut.JPG", type: "" })).toBe(false);
    expect(isHeicLikeFile({ name: "sucuk.webp", type: "image/webp" })).toBe(false);
    expect(isHeicLikeFile({ name: "peynir.png", type: "image/png" })).toBe(false);
  });

  it("returns actionable Samsung S24 guidance for HEIC/HEIF decode failures", () => {
    expect(getPhotoDecodeErrorMessage({ name: "S24_01.heic", type: "" })).toBe(HEIC_DECODE_ERROR_MESSAGE);
    expect(getPhotoDecodeErrorMessage({ name: "S24_02.HEIF", type: "" })).toBe(HEIC_DECODE_ERROR_MESSAGE);
    expect(getPhotoDecodeErrorMessage({ name: "blob", type: "image/heic" })).toBe(HEIC_DECODE_ERROR_MESSAGE);
    expect(HEIC_DECODE_ERROR_MESSAGE).toContain("Samsung S24 Kamera");
  });

  it("returns clean Turkish validation message for non-HEIC unreadable files", () => {
    expect(getPhotoDecodeErrorMessage({ name: "bozuk.jpg", type: "image/jpeg" })).toBe(
      GENERIC_PHOTO_DECODE_ERROR_MESSAGE
    );
    expect(getPhotoDecodeErrorMessage({ name: "bozuk.webp", type: "image/webp" })).toBe(
      GENERIC_PHOTO_DECODE_ERROR_MESSAGE
    );
  });
});

describe("shrinkPhoto decode failure handling", () => {
  const originalImage = globalThis.Image;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  afterEach(() => {
    globalThis.Image = originalImage;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it("translates native EncodingError into Samsung S24 HEIC message and revokes object URL", async () => {
    const revokeSpy = vi.fn();
    URL.createObjectURL = vi.fn(() => "blob:test-heic");
    URL.revokeObjectURL = revokeSpy;

    class FailingImage {
      src = "";
      decode(): Promise<void> {
        return Promise.reject(new DOMException("The source image cannot be decoded.", "EncodingError"));
      }
    }
    globalThis.Image = FailingImage as unknown as typeof Image;

    const heicFile = new File(["fake-heic"], "20261114_S24.heic", { type: "image/heic" });
    await expect(shrinkPhoto(heicFile, "urun")).rejects.toThrow(HEIC_DECODE_ERROR_MESSAGE);
    expect(revokeSpy).toHaveBeenCalledWith("blob:test-heic");
  });

  it("translates native decode error on corrupted JPG into generic Turkish message", async () => {
    const revokeSpy = vi.fn();
    URL.createObjectURL = vi.fn(() => "blob:test-jpg");
    URL.revokeObjectURL = revokeSpy;

    class FailingImage {
      src = "";
      decode(): Promise<void> {
        return Promise.reject(new Error("EncodingError"));
      }
    }
    globalThis.Image = FailingImage as unknown as typeof Image;

    const badJpg = new File(["corrupt"], "bozuk.jpg", { type: "image/jpeg" });
    await expect(shrinkPhoto(badJpg, "urun")).rejects.toThrow(GENERIC_PHOTO_DECODE_ERROR_MESSAGE);
    expect(revokeSpy).toHaveBeenCalledWith("blob:test-jpg");
  });
});
