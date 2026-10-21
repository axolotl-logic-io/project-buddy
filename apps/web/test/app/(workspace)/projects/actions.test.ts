import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  type CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import type { getUserBuddy, UserBuddy } from "@/buddies/buddy-store.ts";
import { getBuddy } from "@/buddies/index.ts";
import type { startProject } from "@/chats/start-chat.ts";
import { AppError } from "@/errors/app-error.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../auth/current-user-test-kit.ts";
import { userBuddyIdFixture } from "../../../id-fixtures.ts";
import { FOX_CHAT } from "../page-fixtures.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
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
