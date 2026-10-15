import { beforeEach, describe, expect, test, vi } from "vitest";
import { FOX_CHAT } from "@/app/(workspace)/page-fixtures.ts";
import {
  type CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import { SIGNED_IN_USER, signInAs } from "@/auth/current-user-test-kit.ts";
import type { getUserBuddy, UserBuddy } from "@/buddies/buddy-store.ts";
import { DEFAULT_BUDDY_ID, getBuddy } from "@/buddies/index.ts";
import type { startProject } from "@/chats/start-chat.ts";
import { AppError } from "@/errors/app-error.ts";
import { userBuddyIdFixture, userIdFixture } from "@/id-fixtures.ts";
import { OPENING_COPY, quotaUsedUpMessage } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);

const chats = vi.hoisted(() => ({
  startProject: vi.fn<typeof startProject>(),
}));
vi.mock("@/chats/start-chat.ts", () => chats);

const buddyStore = vi.hoisted(() => ({
  getUserBuddy: vi.fn<typeof getUserBuddy>(),
}));
vi.mock("@/buddies/buddy-store.ts", () => buddyStore);

const navigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("next/navigation", () => navigation);

const IDLE: CreateProjectState = { kind: "idle" };
const NEEDS_NAME: CreateProjectState = {
  kind: "invalid",
  message: PROJECTS_COPY.needsName,
};
const CHOOSE_BUDDY: CreateProjectState = {
  kind: "invalid",
  message: PROJECTS_COPY.chooseBuddy,
};

// A buddy of her own, cloned from Mr. Tee and renamed.
const OWN_BUDDY: UserBuddy = {
  id: userBuddyIdFixture(),
  name: "Fox Guide",
  parts: getBuddy("mr-tee").parts,
  clonedFrom: "mr-tee",
  createdAt: new Date("2026-10-12T09:00:00Z"),
  updatedAt: new Date("2026-10-12T09:00:00Z"),
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
  chats.startProject.mockResolvedValue({ kind: "started", chat: FOX_CHAT });
  buddyStore.getUserBuddy.mockImplementation((owner, id) => {
    if (owner === SIGNED_IN_USER.id && id === OWN_BUDDY.id) {
      return Promise.resolve(OWN_BUDDY);
    }
    return Promise.resolve(undefined);
  });
});

describe("createProjectAction creating", () => {
  test("starts the project with a trimmed name, then opens its first chat", async () => {
    await expect(
      createProjectAction(IDLE, form({ name: "  Low-poly fox  " })),
    ).rejects.toThrow(`NEXT_REDIRECT /chats/${FOX_CHAT.id}`);

    expect(chats.startProject).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      "Low-poly fox",
      getBuddy(DEFAULT_BUDDY_ID),
    );
    const [started] = chats.startProject.mock.invocationCallOrder;
    const [redirected] = navigation.redirect.mock.invocationCallOrder;
    expect(started).toBeLessThan(redirected ?? 0);
  });
});

describe("createProjectAction choosing the interview buddy", () => {
  test("starts the interview in the built-in buddy the form sends", async () => {
    await expect(
      createProjectAction(
        IDLE,
        form({ name: "Low-poly fox", buddyId: "mr-tee" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(chats.startProject).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      "Low-poly fox",
      getBuddy("mr-tee"),
    );
    expect(buddyStore.getUserBuddy).not.toHaveBeenCalled();
  });

  test("starts the interview in a snapshot of her own buddy, saved under the default buddy's id", async () => {
    await expect(
      createProjectAction(
        IDLE,
        form({ name: "Low-poly fox", buddyId: OWN_BUDDY.id }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(buddyStore.getUserBuddy).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      OWN_BUDDY.id,
    );
    expect(chats.startProject).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      "Low-poly fox",
      { id: DEFAULT_BUDDY_ID, name: "Fox Guide", parts: OWN_BUDDY.parts },
    );
  });

  test("starts the interview with Hippy when the form sends no buddy", async () => {
    await expect(
      createProjectAction(IDLE, form({ name: "Low-poly fox" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(chats.startProject).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      "Low-poly fox",
      getBuddy("hippy"),
    );
  });
});

describe("createProjectAction refusing", () => {
  test("asks for a name when it is blank", async () => {
    expect(await createProjectAction(IDLE, form({ name: "   " }))).toEqual(
      NEEDS_NAME,
    );

    expect(chats.startProject).not.toHaveBeenCalled();
  });

  test("asks for a name when the form has none, or a file for it", async () => {
    const withFile = new FormData();
    withFile.set("name", new File(["fox"], "fox.txt"));

    expect(await createProjectAction(IDLE, form({}))).toEqual(NEEDS_NAME);
    expect(await createProjectAction(IDLE, withFile)).toEqual(NEEDS_NAME);

    expect(chats.startProject).not.toHaveBeenCalled();
  });
});

describe("createProjectAction refusing a buddy", () => {
  test.each([
    ["an unknown buddy", userBuddyIdFixture()],
    ["a malformed id", "nope"],
    ["an empty id", ""],
    ["a built-in id in the wrong case", "HIPPY"],
  ])(
    "asks for one of her buddies, creating nothing, for %s",
    async (_what, buddyId) => {
      expect(
        await createProjectAction(
          IDLE,
          form({ name: "Low-poly fox", buddyId }),
        ),
      ).toEqual(CHOOSE_BUDDY);
      expect(chats.startProject).not.toHaveBeenCalled();
    },
  );

  test("asks for one of her buddies for another user's buddy", async () => {
    signInAs({ ...SIGNED_IN_USER, id: userIdFixture() });

    expect(
      await createProjectAction(
        IDLE,
        form({ name: "Low-poly fox", buddyId: OWN_BUDDY.id }),
      ),
    ).toEqual(CHOOSE_BUDDY);
    expect(chats.startProject).not.toHaveBeenCalled();
  });
});

describe("createProjectAction when Claude is unavailable", () => {
  test("says Claude is unavailable, keeping the name and buddy she chose, when Claude can't open the chat", async () => {
    chats.startProject.mockResolvedValue({ kind: "claudeUnavailable" });

    expect(
      await createProjectAction(
        IDLE,
        form({ name: " Low-poly fox ", buddyId: OWN_BUDDY.id }),
      ),
    ).toEqual({
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      name: "Low-poly fox",
      buddyId: OWN_BUDDY.id,
    });
    expect(navigation.redirect).not.toHaveBeenCalled();
  });
});

describe("createProjectAction once her quota is used up", () => {
  test("says so and when it resets, creating nothing", async () => {
    const resetsOn = new Date("2026-11-01T00:00:00Z");
    chats.startProject.mockResolvedValue({ kind: "quotaUsedUp", resetsOn });

    expect(
      await createProjectAction(IDLE, form({ name: "Low-poly fox" })),
    ).toEqual({ kind: "quotaUsedUp", message: quotaUsedUpMessage(resetsOn) });
    expect(navigation.redirect).not.toHaveBeenCalled();
  });
});

describe("createProjectAction failing", () => {
  test("throws a storage failure on to the error boundary", async () => {
    const failure = new AppError("database-unreachable", new Error("x"));
    chats.startProject.mockRejectedValue(failure);

    await expect(
      createProjectAction(IDLE, form({ name: "Low-poly fox" })),
    ).rejects.toBe(failure);
    expect(navigation.redirect).not.toHaveBeenCalled();
  });
});
