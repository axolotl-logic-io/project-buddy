import {
  APPEARANCE_PREFERENCE_PATH,
  applyThemeAttributes,
  readAppliedTheme,
  themeChoiceCookie,
} from "@/themes/theme-choice.ts";
import { parseThemeChoice, type ThemeChoice } from "@/themes/themes.ts";

const MS_PER_SECOND = 1000;
let latestSave = Promise.resolve();

async function persist(choice: ThemeChoice): Promise<void> {
  const { cookieStore } = globalThis;
  // Cookie Store writes secure cookies. On HTTP some browsers create a
  // cookie they cannot read or replace through a same-origin HTTP response.
  if (globalThis.location.protocol === "https:" && cookieStore !== undefined) {
    const { maxAge, ...cookie } = themeChoiceCookie(choice);
    try {
      await cookieStore.set({
        ...cookie,
        expires: Date.now() + maxAge * MS_PER_SECOND,
      });
      if ((await cookieStore.get(cookie.name))?.value === cookie.value) {
        return;
      }
    } catch {
      // Some browsers expose Cookie Store where it cannot write cookies.
    }
  }
  // HTTP and older browsers save through the same-origin preference route.
  const response = await fetch(APPEARANCE_PREFERENCE_PATH, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(choice),
    keepalive: true,
  });
  if (!response.ok) {
    // The current document still reflects the selected appearance.
  }
}

function keepAppliedChoice(): void {
  // Browser policy or a failed request may prevent saving for the next visit.
}

// Applies the mode immediately. Serial saves keep the last selection when
// the user switches appearances repeatedly.
function chooseMode(mode: string): void {
  const choice = parseThemeChoice({ theme: readAppliedTheme(), mode });
  applyThemeAttributes(choice);
  latestSave = latestSave.then(() => persist(choice)).catch(keepAppliedChoice);
}

export { chooseMode };
