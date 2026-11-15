// Shared image types and references; no server dependencies.
import { z } from "zod";

const IMAGE_MEDIA_TYPE = z.enum([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const IMAGE_PATH = /^\/api\/images\/(?<id>[0-9a-f-]{36})$/u;

// The id of the saved image a URL names, or undefined for any other URL.
function imageId(url: string): string | undefined {
  const { id } = IMAGE_PATH.exec(url)?.groups ?? {};
  return id;
}

export { IMAGE_MEDIA_TYPE, imageId };
