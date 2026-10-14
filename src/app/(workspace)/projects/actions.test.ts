import { beforeEach, describe, expect, test, vi } from "vitest";
import { FOX_CHAT } from "@/app/(workspace)/page-fixtures.ts";
import {
  type CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import { SIGNED_IN_USER, signInAs } from "@/auth/current-user-test-kit.ts";
import type { startProject } from "@/chats/start-chat.ts";
import { AppError } from "@/errors/app-error.ts";
import { userIdFixture, userPersonaIdFixture } from "@/id-fixtures.ts";
import { DEFAULT_PERSONA_ID, getPersona } from "@/personas/index.ts";
import type { getUserPersona, UserPersona } from "@/personas/persona-store.ts";
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

const personaStore = vi.hoisted(() => ({
  getUserPersona: vi.fn<typeof getUserPersona>(),
}));
vi.mock("@/personas/persona-store.ts", () => personaStore);

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
const CHOOSE_PERSONA: CreateProjectState = {
  kind: "invalid",
  message: PROJECTS_COPY.choosePersona,
};

// A persona of her own, cloned from Mr. Tee and renamed.
const OWN_PERSONA: UserPersona = {
  id: userPersonaIdFixture(),
  name: "Fox Guide",
  parts: getPersona("mr-tee").parts,
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
  personaStore.getUserPersona.mockImplementation((owner, id) => {
    if (owner === SIGNED_IN_USER.id && id === OWN_PERSONA.id) {
      return Promise.resolve(OWN_PERSONA);
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
      getPersona(DEFAULT_PERSONA_ID),
    );
    const [started] = chats.startProject.mock.invocationCallOrder;
    const [redirected] = navigation.redirect.mock.invocationCallOrder;
    expect(started).toBeLessThan(redirected ?? 0);
  });
});

describe("createProjectAction choosing the interview persona", () => {
  test("starts the interview in the built-in persona the form sends", async () => {
    await expect(
      createProjectAction(
        IDLE,
        form({ name: "Low-poly fox", personaId: "mr-tee" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(chats.startProject).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      "Low-poly fox",
      getPersona("mr-tee"),
    );
    expect(personaStore.getUserPersona).not.toHaveBeenCalled();
  });

  test("starts the interview in a snapshot of her own persona, saved under the default persona's id", async () => {
    await expect(
      createProjectAction(
        IDLE,
        form({ name: "Low-poly fox", personaId: OWN_PERSONA.id }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(personaStore.getUserPersona).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      OWN_PERSONA.id,
    );
    expect(chats.startProject).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      "Low-poly fox",
      { id: DEFAULT_PERSONA_ID, name: "Fox Guide", parts: OWN_PERSONA.parts },
    );
  });

  test("starts the interview with Hippy when the form sends no persona", async () => {
    await expect(
      createProjectAction(IDLE, form({ name: "Low-poly fox" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(chats.startProject).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      "Low-poly fox",
      getPersona("hippy"),
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

describe("createProjectAction refusing a persona", () => {
  test.each([
    ["an unknown persona", userPersonaIdFixture()],
    ["a malformed id", "nope"],
    ["an empty id", ""],
    ["a built-in id in the wrong case", "HIPPY"],
  ])(
    "asks for one of her personas, creating nothing, for %s",
    async (_what, personaId) => {
      expect(
        await createProjectAction(
          IDLE,
          form({ name: "Low-poly fox", personaId }),
        ),
      ).toEqual(CHOOSE_PERSONA);
      expect(chats.startProject).not.toHaveBeenCalled();
    },
  );

  test("asks for one of her personas for another user's persona", async () => {
    signInAs({ ...SIGNED_IN_USER, id: userIdFixture() });

    expect(
      await createProjectAction(
        IDLE,
        form({ name: "Low-poly fox", personaId: OWN_PERSONA.id }),
      ),
    ).toEqual(CHOOSE_PERSONA);
    expect(chats.startProject).not.toHaveBeenCalled();
  });
});

describe("createProjectAction when Claude is unavailable", () => {
  test("says Claude is unavailable, keeping the name and persona she chose, when Claude can't open the chat", async () => {
    chats.startProject.mockResolvedValue({ kind: "claudeUnavailable" });

    expect(
      await createProjectAction(
        IDLE,
        form({ name: " Low-poly fox ", personaId: OWN_PERSONA.id }),
      ),
    ).toEqual({
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      name: "Low-poly fox",
      personaId: OWN_PERSONA.id,
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
