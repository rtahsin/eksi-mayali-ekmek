import { media, type MediaId } from "@content/media/registry";
import type {
  MediaLicense,
  MediaKind,
  MediaDimensions,
  MediaItemInput,
  MediaRegistry,
} from "./define";
import type { ContentRef } from "@/lib/knowledge/refs";

export type {
  MediaLicense,
  MediaKind,
  MediaDimensions,
  MediaItemInput,
  MediaRegistry,
  MediaId,
};

export { defineMedia } from "./define";

export const MEDIA = media;

export function getMedia(id: MediaId | string): MediaItemInput | undefined {
  return (media as Record<string, MediaItemInput>)[id];
}

export function allMedia(): (MediaItemInput & { id: string })[] {
  return Object.entries(media).map(([id, item]) => ({
    id,
    ...item,
  }));
}

export function toContentRefs(): ContentRef[] {
  return Object.entries(media).map(([id, item]) => ({
    kind: "gezinme", // medya referansı olarak doğrulamaya katılır
    id,
    surface: "icerik",
    claimIds: [],
    conceptIds: [],
    mediaIds: [id],
    text: item.alt,
  }));
}
