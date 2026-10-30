// Shared image limits and references; no server dependencies.
import { z } from "zod";

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;
const IMAGE_MEDIA_TYPE = z.enum(IMAGE_TYPES);
const MAX_IMAGE_BYTES = 2_097_152;
const MAX_MESSAGE_IMAGES = 4;
const IMAGE_PATH = /^\/api\/images\/(?<id>[0-9a-f-]{36})$/u;
const MAX_IMAGE_NAME = 255;
const IMAGE_FILE_PART = z.object({
  type: z.literal("file"),
  mediaType: IMAGE_MEDIA_TYPE,
  filename: z.string().max(MAX_IMAGE_NAME).default("Image"),
  url: z
    .string()
    .transform(canonicalImageUrl)
    .pipe(z.string().regex(IMAGE_PATH)),
});
function canonicalImageUrl(value: string): string {
  if (value.startsWith("/")) {
    return value;
  }
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return "";
  }
  return "";
}
function imageUrl(id: string): string {
  return `/api/images/${id}`;
}
function imageId(url: string): string | undefined {
  const { id } = IMAGE_PATH.exec(url)?.groups ?? {};
  return id;
}

export {
  IMAGE_FILE_PART,
  IMAGE_MEDIA_TYPE,
  IMAGE_TYPES,
  imageId,
  imageUrl,
  MAX_IMAGE_BYTES,
  MAX_MESSAGE_IMAGES,
};
