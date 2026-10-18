// Prompt preferences for tests that do not use the real account store.
// No saved name or switches unless the test supplies them.
import { vi } from "vitest";
import type * as usersStore from "@/accounts/users-store.ts";

const readPromptPreferences = vi.fn<typeof usersStore.readPromptPreferences>(
  () => Promise.resolve({ userName: undefined, hiddenExtras: [] }),
);

export { readPromptPreferences };
