import sharp from "sharp";
import type { BrowserCommandContext } from "vitest/node";

const ANTIALIAS_INSET = 2;
const PIXEL_CENTER = 0.5;

// Read every rendered material channel, except the rounded transparent corners
// and their antialiased boundary. Screenshot pixels include composited shadows
// and tint, unlike the image URL, computed opacity, or a sampled center color.
interface MaterialPixels {
  readonly width: number;
  readonly height: number;
  readonly channels: number[];
}

async function materialPixels(
  context: BrowserCommandContext,
  selector: string,
): Promise<MaterialPixels> {
  const material = context.iframe.locator(selector);
  const radius = await material.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).borderTopLeftRadius),
  );
  const bounds = await material.boundingBox();
  if (bounds === null) {
    throw new Error("The material is not visible");
  }
  const png = await material.screenshot();
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels: number[] = [];
  const { width, height, channels } = info;
  const offsetX = bounds.x - Math.floor(bounds.x);
  const offsetY = bounds.y - Math.floor(bounds.y);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const localX = x + PIXEL_CENTER - offsetX;
      const localY = y + PIXEL_CENTER - offsetY;
      const cornerX = Math.max(
        radius - localX,
        localX - (bounds.width - radius),
        0,
      );
      const cornerY = Math.max(
        radius - localY,
        localY - (bounds.height - radius),
        0,
      );
      const outsideMaterial =
        localX <= ANTIALIAS_INSET ||
        localX >= bounds.width - ANTIALIAS_INSET ||
        localY <= ANTIALIAS_INSET ||
        localY >= bounds.height - ANTIALIAS_INSET ||
        (cornerX > 0 &&
          cornerY > 0 &&
          cornerX ** 2 + cornerY ** 2 >= (radius - ANTIALIAS_INSET) ** 2);
      if (!outsideMaterial) {
        const start = (y * width + x) * channels;
        pixels.push(...data.subarray(start, start + channels));
      }
    }
  }
  return { width, height, channels: pixels };
}

export { type MaterialPixels, materialPixels };
