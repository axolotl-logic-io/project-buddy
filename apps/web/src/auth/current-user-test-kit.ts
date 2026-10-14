// For tests of pages, Server Actions and routes: a stand-in for
// current-user.ts, which a test file mounts with
//   vi.mock("@/auth/current-user.ts", () => import("@/auth/current-user-test-kit.ts"));
// and resets with signInAs(SIGNED_IN_USER) before each test. Both functions
// answer with the user it signed in; signOut() leaves currentUser answering
// undefined and requireUser throwing, as the real one redirects.
import { vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import type * as currentUserModule from "@/auth/current-user.ts";
import { userIdFixture } from "@/id-fixtures.ts";

// The user the tests sign in as.
const SIGNED_IN_USER: User = {
  id: userIdFixture("7a6b5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d"),
  email: "fox@example.com",
  sessionEpoch: 0,
  hiddenExtras: [],
};

// What requireUser throws for a signed-out request, as redirect() would.
const SIGNED_OUT_REDIRECT = "NEXT_REDIRECT to the sign-in page";

const currentUser = vi.fn<typeof currentUserModule.currentUser>();
const requireUser = vi.fn<typeof currentUserModule.requireUser>();

function signInAs(user: User): void {
  currentUser.mockResolvedValue(user);
  requireUser.mockResolvedValue(user);
}

function signOut(): void {
  currentUser.mockResolvedValue(undefined);
  requireUser.mockRejectedValue(new Error(SIGNED_OUT_REDIRECT));
}

export {
  currentUser,
  requireUser,
  SIGNED_IN_USER,
  SIGNED_OUT_REDIRECT,
  signInAs,
  signOut,
};
