import type { ImageLoaderProps } from "next/image";
import { z } from "zod";

const SMALL_WIDTH = 64;
const MEDIUM_WIDTH = 128;
const LARGE_WIDTH = 256;
const RETINA_WIDTH = 512;
const SOURCE_WIDTH = 1024;
const VISUAL_WIDTHS = [
  SMALL_WIDTH,
  MEDIUM_WIDTH,
  LARGE_WIDTH,
  RETINA_WIDTH,
  SOURCE_WIDTH,
] as const;
const VISUAL_WIDTH = z.literal(VISUAL_WIDTHS);
const PNG_SUFFIX = /\.png$/u;

// Both static derivatives and private delivery offer the same bounded sizes.
function visualImageLoader({ src, width }: ImageLoaderProps): string {
  const selected =
    VISUAL_WIDTHS.find((candidate) => candidate >= width) ?? SOURCE_WIDTH;
  if (src.startsWith("/constructs/")) {
    return `${src.replace(PNG_SUFFIX, "")}-${selected}.webp`;
  }
  return `${src}?width=${selected}`;
}

export { VISUAL_WIDTH, VISUAL_WIDTHS, visualImageLoader };
