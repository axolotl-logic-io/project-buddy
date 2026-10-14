import { beforeEach, describe, expect, test, vi } from "vitest";
import { clonePersonaAction } from "@/app/(workspace)/personas/actions.ts";
import {
  SIGNED_IN_USER,
  SIGNED_OUT_REDIRECT,
  signInAs,
  signOut,
} from "@/auth/current-user-test-kit.ts";
import { AppError } from "@/errors/app-error.ts";
import { userPersonaIdFixture } from "@/id-fixtures.ts";
import { getPersona } from "@/personas/index.ts";
import type { clonePersona, UserPersona } from "@/personas/persona-store.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);

const store = vi.hoisted(() => ({
  clonePersona: vi.fn<typeof clonePersona>(),
}));
vi.mock("@/personas/persona-store.ts", () => store);

const navigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("next/navigation", () => navigation);

const CLONE: UserPersona = {
  id: userPersonaIdFixture(),
  name: "Hippy (clone)",
  parts: getPersona("hippy").parts,
  clonedFrom: "hippy",
  createdAt: new Date("2026-10-13T09:00:00Z"),
  updatedAt: new Date("2026-10-13T09:00:00Z"),
};

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  store.clonePersona.mockResolvedValue(CLONE);
});

describe("clonePersonaAction cloning", () => {
  test("clones the persona for her, then shows her personas", async () => {
    await expect(
      clonePersonaAction(form({ sourceId: "hippy" })),
    ).rejects.toThrow("NEXT_REDIRECT /personas");

    expect(store.clonePersona).toHaveBeenCalledWith(SIGNED_IN_USER.id, "hippy");
    const [cloned] = store.clonePersona.mock.invocationCallOrder;
    const [redirected] = navigation.redirect.mock.invocationCallOrder;
    expect(cloned).toBeLessThan(redirected ?? 0);
  });

  test("shows her personas when the source is unknown or another user's", async () => {
    store.clonePersona.mockResolvedValue(undefined);

    await expect(
      clonePersonaAction(form({ sourceId: CLONE.id })),
    ).rejects.toThrow("NEXT_REDIRECT /personas");

    expect(store.clonePersona).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      CLONE.id,
    );
  });
});

describe("clonePersonaAction refusing", () => {
  test("clones nothing when the form names no source, or a file", async () => {
    const withFile = new FormData();
    withFile.set("sourceId", new File(["hippy"], "hippy.txt"));

    await expect(clonePersonaAction(form({}))).rejects.toThrow(
      "NEXT_REDIRECT /personas",
    );
    await expect(clonePersonaAction(withFile)).rejects.toThrow(
      "NEXT_REDIRECT /personas",
    );

    expect(store.clonePersona).not.toHaveBeenCalled();
  });

  test("clones nothing for a signed-out request", async () => {
    signOut();

    await expect(
      clonePersonaAction(form({ sourceId: "hippy" })),
    ).rejects.toThrow(SIGNED_OUT_REDIRECT);

    expect(store.clonePersona).not.toHaveBeenCalled();
  });

  test("throws a storage failure on to the error boundary", async () => {
    const failure = new AppError("database-unreachable", new Error("x"));
    store.clonePersona.mockRejectedValue(failure);

    await expect(clonePersonaAction(form({ sourceId: "hippy" }))).rejects.toBe(
      failure,
    );
    expect(navigation.redirect).not.toHaveBeenCalled();
  });
});
