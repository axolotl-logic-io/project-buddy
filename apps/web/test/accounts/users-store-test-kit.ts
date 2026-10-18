// For tests whose code reads the owner's name: a stand-in for
// users-store.ts's readUserName, which a test file mounts with
//   vi.mock("@/accounts/users-store.ts", () => import("./users-store-test-kit.ts"));
// The owner has no name unless a test says otherwise.
import { vi } from "vitest";
import type * as usersStore from "@/accounts/users-store.ts";

const readUserName = vi.fn<typeof usersStore.readUserName>(() =>
  Promise.resolve(undefined),
);

export { readUserName };
