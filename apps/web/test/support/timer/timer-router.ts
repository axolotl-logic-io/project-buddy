// Where the timer's setup navigates in a browser test. A test file mocks
// next/navigation with it:
//   vi.mock("next/navigation", () => import("../../support/timer/timer-router.ts"));
import { vi } from "vitest";

const timerRouter = { push: vi.fn<(href: string) => void>() };

function useRouter(): typeof timerRouter {
  return timerRouter;
}

export { timerRouter, useRouter };
