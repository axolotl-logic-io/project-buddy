// Load the retained browser assertions' existing matcher types before the
// include patterns bring in Vitest's browser declarations. In particular,
// chat-message.browser.test.tsx uses toHaveTextContent with a RegExp.
// This is type-only: it installs no jsdom setup or runtime matchers.
import "@testing-library/jest-dom/vitest";
