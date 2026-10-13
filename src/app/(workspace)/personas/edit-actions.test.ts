import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  editBuiltInPersonaAction,
  resetPersonaPartAction,
  savePersonaAction,
} from "@/app/(workspace)/personas/actions.ts";
import {
  SIGNED_IN_USER,
  SIGNED_OUT_REDIRECT,
  signInAs,
  signOut,
} from "@/auth/current-user-test-kit.ts";
import { userPersonaIdFixture } from "@/id-fixtures.ts";
import { getPersona, type PersonaParts } from "@/personas/index.ts";
import type {
  clonePersona,
  getUserPersona,
  UserPersona,
  updatePersona,
} from "@/personas/persona-store.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);

const store = vi.hoisted(() => ({
  clonePersona: vi.fn<typeof clonePersona>(),
  getUserPersona: vi.fn<typeof getUserPersona>(),
  updatePersona: vi.fn<typeof updatePersona>(),
}));
vi.mock("@/personas/persona-store.ts", () => store);

const navigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("next/navigation", () => navigation);

const MR_TEE: PersonaParts = getPersona("mr-tee").parts;

// Her clone of Mr. Tee, with its voice and citation rules edited.
const PERSONA: UserPersona = {
  id: userPersonaIdFixture(),
  name: "Mr. Tee (copy)",
  parts: { ...MR_TEE, voice: "Pity the fool.", citation: "Cite nothing." },
  clonedFrom: "mr-tee",
  createdAt: new Date("2026-10-13T09:00:00Z"),
  updatedAt: new Date("2026-10-13T09:00:00Z"),
};

const PAGE = `NEXT_REDIRECT /personas/${PERSONA.id}`;

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

function saveForm(parts: PersonaParts): FormData {
  return form({ personaId: PERSONA.id, name: " Mr. Tee, edited ", ...parts });
}

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  store.clonePersona.mockResolvedValue(PERSONA);
  store.getUserPersona.mockResolvedValue(PERSONA);
  store.updatePersona.mockResolvedValue(PERSONA);
});

describe("savePersonaAction", () => {
  test("saves her name and every part, with LF line breaks, then shows the page", async () => {
    const parts = { ...MR_TEE, voice: "Line one\r\nLine two" };

    await expect(savePersonaAction(saveForm(parts))).rejects.toThrow(PAGE);

    expect(store.updatePersona).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      PERSONA.id,
      {
        name: "Mr. Tee, edited",
        parts: { ...MR_TEE, voice: "Line one\nLine two" },
      },
    );
  });

  test("is not found for a persona unknown or another user's", async () => {
    store.updatePersona.mockResolvedValue(undefined);

    await expect(savePersonaAction(saveForm(MR_TEE))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(navigation.redirect).not.toHaveBeenCalled();
  });

  test("saves nothing without a name or a part, or signed out", async () => {
    const { answerNow: _missing, ...partial } = MR_TEE;

    await expect(
      savePersonaAction(form({ personaId: PERSONA.id, name: "X", ...partial })),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(
      savePersonaAction(form({ personaId: PERSONA.id, name: " ", ...MR_TEE })),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    signOut();
    await expect(savePersonaAction(saveForm(MR_TEE))).rejects.toThrow(
      SIGNED_OUT_REDIRECT,
    );

    expect(store.updatePersona).not.toHaveBeenCalled();
  });
});

describe("resetPersonaPartAction", () => {
  test("resets the voice to the built-in persona's it was cloned from", async () => {
    await expect(
      resetPersonaPartAction(form({ personaId: PERSONA.id, part: "voice" })),
    ).rejects.toThrow(PAGE);

    expect(store.getUserPersona).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      PERSONA.id,
    );
    expect(store.updatePersona).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      PERSONA.id,
      { parts: { ...PERSONA.parts, voice: MR_TEE.voice } },
    );
  });

  test("resets a mechanics part to every persona's default", async () => {
    await expect(
      resetPersonaPartAction(form({ personaId: PERSONA.id, part: "citation" })),
    ).rejects.toThrow(PAGE);

    expect(store.updatePersona).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      PERSONA.id,
      { parts: { ...PERSONA.parts, citation: MR_TEE.citation } },
    );
  });

  test("changes nothing for an unknown or foreign persona, or no part", async () => {
    await expect(
      resetPersonaPartAction(form({ personaId: PERSONA.id, part: "toString" })),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    store.getUserPersona.mockResolvedValue(undefined);
    await expect(
      resetPersonaPartAction(form({ personaId: "hippy", part: "voice" })),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(store.updatePersona).not.toHaveBeenCalled();
  });
});

describe("editBuiltInPersonaAction", () => {
  test("clones the built-in persona, then opens the clone", async () => {
    await expect(
      editBuiltInPersonaAction(form({ personaId: "mr-tee" })),
    ).rejects.toThrow(PAGE);

    expect(store.clonePersona).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      "mr-tee",
    );
  });

  test("clones nothing for an id that is not a built-in persona's", async () => {
    await expect(
      editBuiltInPersonaAction(form({ personaId: PERSONA.id })),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(
      editBuiltInPersonaAction(form({ personaId: "nobody" })),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(editBuiltInPersonaAction(form({}))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );

    expect(store.clonePersona).not.toHaveBeenCalled();
  });
});
