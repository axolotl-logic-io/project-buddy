// For the browser tests (*.browser.test.tsx) that move focus with the
// keyboard, in Chromium and WebKit alike.
import { server, userEvent } from "vitest/browser";

// Moves the keyboard's focus to the next control, as Tab does. WebKit on
// macOS follows Safari's default, where Tab skips buttons, radio buttons and
// native selects; Option+Tab reaches every control without changing
// settings, and does the same in WebKit on Linux.
async function tabForward(): Promise<void> {
  if (server.browser === "webkit") {
    await userEvent.keyboard("{Alt>}{Tab}{/Alt}");
  } else {
    await userEvent.tab();
  }
}

export { tabForward };
