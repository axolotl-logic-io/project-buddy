// Interacts with the page once it has hydrated.
import { expect, type Locator } from "@playwright/test";

// The start of the key React puts on a DOM node when it hydrates it, which
// is when the node's props, and so its handlers, are attached. React adds a
// random suffix.
const REACT_PROPS_KEY = "__reactProps$";

// Waits until React has hydrated target. A page shows its server-rendered
// HTML before it hydrates, and WebKit hydrates well after the load event
// that goto waits for: typing there before
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
// page.goto never types into a page that hasn't hydrated.
async function fillWhenReady(field: Locator, text: string): Promise<void> {
  await waitForHydrated(field);
  await field.clear();
  await field.fill(text);
  await expect(field).toHaveValue(text);
}

export { fillWhenReady, waitForHydrated };
