import { preload } from "react-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { preloadThemeFonts } from "@/themes/preload-theme-fonts.ts";
import {
  THEME_TYPEFACES,
  TYPEFACE_FONT_URLS,
} from "@/themes/theme-font-urls.ts";
import { THEMES } from "@/themes/themes.ts";

vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  preload: vi.fn(),
}));

const FONT_OPTIONS = {
  as: "font",
  type: "font/woff2",
  crossOrigin: "anonymous",
};

beforeEach(() => {
  vi.mocked(preload).mockClear();
});

describe("preloadThemeFonts", () => {
  test.each(THEMES)(
    "preloads exactly $name's font files when another theme is applied",
    ({ id }) => {
      const applied = THEMES.find((theme) => theme.id !== id)?.id ?? id;

      preloadThemeFonts(id, applied);

      expect(vi.mocked(preload).mock.calls).toEqual(
        THEME_TYPEFACES[id].map((typeface) => [
          TYPEFACE_FONT_URLS[typeface],
          FONT_OPTIONS,
        ]),
      );
    },
  );

  test.each(THEMES)(
    "preloads nothing when $name is the applied theme",
    ({ id }) => {
      preloadThemeFonts(id, id);

      expect(preload).not.toHaveBeenCalled();
    },
  );
});
