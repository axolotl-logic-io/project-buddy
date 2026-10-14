import { beforeEach, describe, expect, test, vi } from "vitest";
import type { saveHiddenExtras } from "@/accounts/users-store.ts";
import {
  SIGNED_IN_USER,
  signInAs,
  signOut,
} from "@/auth/current-user-test-kit.ts";
import { AppError } from "@/errors/app-error.ts";
import { hiddenFlagsCookie } from "@/flags/flag-choice.ts";
import { saveHiddenFlagsAction } from "@/flags/save-hidden-flags-action.ts";
import type { writeHiddenFlagsCookie } from "@/flags/seed-hidden-flags.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);

const usersStore = vi.hoisted(() => ({
  saveHiddenExtras: vi.fn<typeof saveHiddenExtras>(),
}));
vi.mock("@/accounts/users-store.ts", () => usersStore);

const seed = vi.hoisted(() => ({
  writeHiddenFlagsCookie: vi.fn<typeof writeHiddenFlagsCookie>(),
}));
vi.mock("@/flags/seed-hidden-flags.ts", () => seed);

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  usersStore.saveHiddenExtras.mockResolvedValue();
  seed.writeHiddenFlagsCookie.mockResolvedValue();
});

describe("saveHiddenFlagsAction", () => {
  test("saves the known flags to her account, as those switched from their default, then to this browser's cookie", async () => {
    await saveHiddenFlagsAction([
      "tool-lines",
      "no-such-flag",
      "working-notes",
    ]);

    const known = ["working-notes", "tool-lines"];
    expect(usersStore.saveHiddenExtras).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      ["working-notes", "tool-lines", "persona-mechanics", "interview-persona"],
    );
    expect(seed.writeHiddenFlagsCookie).toHaveBeenCalledWith(known);
    const [saved] = usersStore.saveHiddenExtras.mock.invocationCallOrder;
    const [written] = seed.writeHiddenFlagsCookie.mock.invocationCallOrder;
    expect(saved).toBeLessThan(written ?? 0);
  });

  test("leaves the cookie alone when her account can't be saved", async () => {
    usersStore.saveHiddenExtras.mockRejectedValue(
      new AppError("database-unreachable", new Error("down")),
    );

    await expect(saveHiddenFlagsAction(["tool-lines"])).rejects.toBeInstanceOf(
      AppError,
    );
    expect(seed.writeHiddenFlagsCookie).not.toHaveBeenCalled();
  });

  test("refuses anything but a list of ids, saving nothing", async () => {
    await expect(saveHiddenFlagsAction("tool-lines")).rejects.toThrow();
    await expect(saveHiddenFlagsAction([1])).rejects.toThrow();

    expect(usersStore.saveHiddenExtras).not.toHaveBeenCalled();
    expect(seed.writeHiddenFlagsCookie).not.toHaveBeenCalled();
  });

  test("saves nothing for a signed-out request", async () => {
    signOut();

    await expect(saveHiddenFlagsAction([])).rejects.toThrow();
    expect(usersStore.saveHiddenExtras).not.toHaveBeenCalled();
    expect(seed.writeHiddenFlagsCookie).not.toHaveBeenCalled();
  });
});

describe("saveHiddenFlagsAction with an extra off by default", () => {
  test("saving one hidden extra stores it beside the extras off by default she shows", async () => {
    await saveHiddenFlagsAction(["tool-lines"]);

    expect(usersStore.saveHiddenExtras).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      ["tool-lines", "persona-mechanics", "interview-persona"],
    );
    expect(seed.writeHiddenFlagsCookie).toHaveBeenCalledWith(["tool-lines"]);
    expect(hiddenFlagsCookie(["tool-lines"]).value).toBe(
      "tool-lines.persona-mechanics.interview-persona",
    );
  });

  test("hiding only the persona mechanics and interview persona stores no switch", async () => {
    await saveHiddenFlagsAction(["persona-mechanics", "interview-persona"]);

    expect(usersStore.saveHiddenExtras).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      [],
    );
  });
});
