// Load the retained browser assertions' existing matcher types before the
// include patterns bring in Vitest's browser declarations.
// This is type-only: it installs no jsdom setup or runtime matchers.
import "@testing-library/jest-dom/vitest";
