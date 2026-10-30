// For the browser tests (*.browser.test.tsx): the types of the commands
// vitest.config.mts gives them, which run in the test runner, outside the
// page. A browser test calls them through `commands` from vitest/browser.
declare module "vitest/browser" {
  interface BrowserCommands {
    // Switches the system color scheme the page sees, as
    // prefers-color-scheme reports it.
    emulateColorScheme: (colorScheme: "light" | "dark") => Promise<void>;
  }
}

export {};
