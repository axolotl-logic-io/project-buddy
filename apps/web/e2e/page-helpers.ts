// Small helpers any spec may need, whatever page it is on: finding the page's
// own alert, and typing into a field once the page has hydrated.
import { expect, type Locator, type Page } from "@playwright/test";

// The start of the key React puts on a DOM node when it hydrates it, which
// is when the node's props, and so its handlers, are attached. React adds a
// random suffix.
const REACT_PROPS_KEY = "__reactProps$";

// The page's own alert. Next's route announcer is an alert too, outside the
// main landmark.
function alertIn(page: Page): Locator {
  return page.getByRole("main").getByRole("alert");
}

// Waits until React has hydrated target. A page shows its server-rendered
// HTML before it hydrates, and WebKit hydrates well after the load event
// that goto waits for (waitForComposer in chat-page.ts): typing there before
// then fills the box but not the form's state, and a click there does
// nothing.
async function waitForHydrated(target: Locator): Promise<void> {
  await expect
    .poll(
      async () =>
        await target.evaluate(
          (node, key) => Object.keys(node).some((name) => name.startsWith(key)),
          REACT_PROPS_KEY,
        ),
    )
    .toBe(true);
}

// Types text into field once React has hydrated it, so a fill right after
// page.goto never types into a page that hasn't hydrated. The chat's
// composer has its own, stronger wait: sendMessage in chat-page.ts.
async function fillWhenReady(field: Locator, text: string): Promise<void> {
  await waitForHydrated(field);
  await field.clear();
  await field.fill(text);
  await expect(field).toHaveValue(text);
}

export { alertIn, fillWhenReady };
