// "use_case_install_app" in use-cases/notifications.md, in Chromium and
// WebKit: the web app manifest names Project Buddy, opens the landing page
// in its own window, and lists icons that are served at the sizes it gives;
// the service worker is served; and the colours a phone shows outside the
// pages are the default theme's backgrounds, as the browser renders them.
// That the proxy serves these files without a session is
// web-app-access.test.ts's to check.
import { afterEach, describe, expect, test } from "vitest";
import manifest from "@/app/manifest.ts";
import { MODE_ATTRIBUTE, THEME_ATTRIBUTE } from "@/themes/theme-choice.ts";
import { DEFAULT_THEME_CHOICE } from "@/themes/themes.ts";
import { APP_COLORS, APP_ICONS } from "@/ui/web-app.ts";

const RGB = /^rgb\((?<red>\d+), (?<green>\d+), (?<blue>\d+)\)$/u;

// Rounding from oklch() to 8-bit sRGB may differ by one step between the
// browser and the value written down.
const CHANNEL_TOLERANCE = 1;

// Red, green and blue, before a pixel's alpha.
const COLOR_CHANNELS = 3;

// The size an image at src loads at.
async function loadedSize(
  src: string,
): Promise<{ readonly width: number; readonly height: number }> {
  const image = new Image();
  image.src = src;
  await image.decode();
  return { width: image.naturalWidth, height: image.naturalHeight };
}

// The red, green and blue of an rgb() value.
function channels(color: string): readonly number[] {
  const { red = "", green = "", blue = "" } = RGB.exec(color)?.groups ?? {};
  return [red, green, blue].map(Number);
}

// The default theme's page background in mode, as the browser paints it.
function paintedBackground(mode: "light" | "dark"): readonly number[] {
  document.documentElement.setAttribute(
    THEME_ATTRIBUTE,
    DEFAULT_THEME_CHOICE.theme,
  );
  document.documentElement.setAttribute(MODE_ATTRIBUTE, mode);
  const page = document.createElement("div");
  page.className = "bg-background";
  document.body.append(page);
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("No 2D canvas in this browser.");
  }
  context.fillStyle = getComputedStyle(page).backgroundColor;
  context.fillRect(0, 0, 1, 1);
  page.remove();
  return [...context.getImageData(0, 0, 1, 1).data.slice(0, COLOR_CHANNELS)];
}

// The largest difference between two colours' channels.
function channelDifference(
  painted: readonly number[],
  written: readonly number[],
): number {
  return Math.max(
    ...painted.map((channel, index) =>
      Math.abs(channel - (written[index] ?? Number.POSITIVE_INFINITY)),
    ),
  );
}

afterEach(() => {
  document.documentElement.removeAttribute(THEME_ATTRIBUTE);
  document.documentElement.removeAttribute(MODE_ATTRIBUTE);
});

describe("use_case_install_app", () => {
  test("the app is Project Buddy, opening the landing page in its own window", () => {
    const app = manifest();

    expect(app.name).toBe("Project Buddy");
    expect(app.short_name).toBe("Project Buddy");
    expect(app.start_url).toBe("/");
    expect(app.display).toBe("standalone");
  });

  test("each icon is served at the size the manifest gives, with a maskable one", async () => {
    const icons = manifest().icons ?? [];
    const sizes = await Promise.all(
      icons.map(async ({ src, sizes: declared = "" }) => {
        const { width, height } = await loadedSize(src);
        return { declared, loaded: `${width}x${height}` };
      }),
    );

    for (const { declared, loaded } of sizes) {
      expect(loaded).toBe(declared);
    }
    expect(sizes.map(({ declared }) => declared)).toContain("512x512");
    expect(icons.map(({ purpose }) => purpose)).toContain("maskable");
    expect(await loadedSize(APP_ICONS.apple.src)).toStrictEqual({
      width: APP_ICONS.apple.size,
      height: APP_ICONS.apple.size,
    });
  });

  test("the service worker that shows notifications is served", async () => {
    const response = await fetch("/sw.js");

    expect(response.ok).toBe(true);
    expect(await response.text()).toContain("notificationclick");
  });

  test("the colours outside the pages are the default theme's backgrounds", () => {
    expect(manifest().background_color).toBe(APP_COLORS.lightBackground);
    expect(manifest().theme_color).toBe(APP_COLORS.lightBackground);
    expect(
      channelDifference(
        paintedBackground("light"),
        channels(APP_COLORS.lightBackground),
      ),
    ).toBeLessThanOrEqual(CHANNEL_TOLERANCE);
    expect(
      channelDifference(
        paintedBackground("dark"),
        channels(APP_COLORS.darkBackground),
      ),
    ).toBeLessThanOrEqual(CHANNEL_TOLERANCE);
  });
});
