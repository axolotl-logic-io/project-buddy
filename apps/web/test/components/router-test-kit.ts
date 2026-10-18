// For tests that render ChatView, which refreshes the page through the App
// Router: a stand-in for next/navigation, which a test file mounts with
//   vi.mock("next/navigation", () => import("./router-test-kit.ts"));
// and whose refresh records each refresh.
import { vi } from "vitest";

const refresh = vi.fn<() => void>();

function useRouter(): { refresh: () => void } {
  return { refresh };
}

export { refresh, useRouter };
