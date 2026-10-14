import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { SIGNED_IN_USER, signInAs } from "@/auth/current-user-test-kit.ts";
import { userPersonaIdFixture } from "@/id-fixtures.ts";
import { getPersona } from "@/personas/index.ts";
import type { getUserPersona, UserPersona } from "@/personas/persona-store.ts";
import {
  PERSONA_COPY,
  PERSONA_PARTS_COPY,
  PERSONAS_COPY,
} from "@/ui/copy/personas.ts";
import PersonaPage from "./page.tsx";

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);

const store = vi.hoisted(() => ({
  getUserPersona: vi.fn<typeof getUserPersona>(),
}));
vi.mock("@/personas/persona-store.ts", () => store);

vi.mock("next/navigation", () => ({
  notFound: (): never => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const OWN_PERSONA: UserPersona = {
  id: userPersonaIdFixture(),
  name: "Mr. Tee (clone)",
  parts: { ...getPersona("mr-tee").parts, voice: "Pity the fool." },
  clonedFrom: "mr-tee",
  createdAt: new Date("2026-10-12T09:00:00Z"),
  updatedAt: new Date("2026-10-12T09:00:00Z"),
};

const MEMORY_TAGS = /<project_memory>/u;

// Each part's field on the page, by its part key, as the extra it is in:
// the mechanics parts in persona-mechanics, which Settings hides by
// default, and the persona's own parts in none.
const EXPECTED_EXTRAS: Readonly<Record<string, string | null>> = {
  voice: null,
  teachingRules: null,
  role: null,
  sharedRules: "persona-mechanics",
  citation: "persona-mechanics",
  interview: "persona-mechanics",
  memoryIntro: "persona-mechanics",
  emptyMemory: "persona-mechanics",
  searchManualTool: "persona-mechanics",
  citeManualTool: "persona-mechanics",
  updateMemoryTool: "persona-mechanics",
  openingKickoff: "persona-mechanics",
  neutralKickoff: "persona-mechanics",
  answerNow: "persona-mechanics",
};

// The extra each part's field is in on the rendered page, by part key.
function renderedExtras(): Record<string, string | null> {
  return Object.fromEntries(
    Object.entries(PERSONA_PARTS_COPY).map(([key, { label }]) => [
      key,
      screen
        .getByRole("textbox", { name: label })
        .closest("[data-extra]")
        ?.getAttribute("data-extra") ?? null,
    ]),
  );
}

// The page for the persona with this id.
async function renderPage(personaId: string): Promise<void> {
  render(
    await PersonaPage({
      params: Promise.resolve({ personaId }),
      searchParams: Promise.resolve({}),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  store.getUserPersona.mockResolvedValue(OWN_PERSONA);
});

describe("Persona page for a built-in persona", () => {
  test("shows a built-in persona's parts read-only, with Customize", async () => {
    await renderPage("hippy");

    expect(
      screen.getByRole("heading", { level: 1, name: "Hippy" }),
    ).toBeInTheDocument();
    const voice = screen.getByRole("textbox", {
      name: PERSONA_PARTS_COPY.voice.label,
    });
    expect(voice).toHaveValue(getPersona("hippy").parts.voice);
    expect(voice).toHaveAttribute("readonly");
    expect(
      screen.getByRole("button", { name: PERSONAS_COPY.customize }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: PERSONA_COPY.save }),
    ).not.toBeInTheDocument();
    expect(store.getUserPersona).not.toHaveBeenCalled();
  });

  test("puts the mechanics parts, and only them, in the persona-mechanics extra", async () => {
    await renderPage("hippy");

    expect(renderedExtras()).toEqual(EXPECTED_EXTRAS);
  });
});

describe("Persona page for her own persona", () => {
  test("shows her persona's name and every part to edit, each with a reset", async () => {
    await renderPage(OWN_PERSONA.id);

    expect(store.getUserPersona).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      OWN_PERSONA.id,
    );
    expect(
      screen.getByRole("textbox", { name: PERSONA_COPY.nameLabel }),
    ).toHaveValue(OWN_PERSONA.name);
    for (const [key, { label }] of Object.entries(PERSONA_PARTS_COPY)) {
      const field = screen.getByRole("textbox", { name: label });
      expect(field).not.toHaveAttribute("readonly");
      expect(field).toHaveAttribute("name", key);
      expect(
        screen.getByRole("button", { name: PERSONA_COPY.resetLabel(label) }),
      ).toHaveAttribute("form", `reset-${key}`);
    }
    expect(
      screen.getByRole("textbox", { name: PERSONA_PARTS_COPY.voice.label }),
    ).toHaveValue("Pity the fool.");
  });

  test("warns that a mechanics part can break citations, memory or search", async () => {
    await renderPage(OWN_PERSONA.id);

    expect(
      screen.getByRole("textbox", { name: PERSONA_PARTS_COPY.citation.label }),
    ).toHaveAccessibleDescription(
      expect.stringContaining(PERSONA_COPY.mechanicsWarning),
    );
    expect(
      screen.getByRole("textbox", { name: PERSONA_PARTS_COPY.voice.label }),
    ).not.toHaveAccessibleDescription(
      expect.stringContaining(PERSONA_COPY.mechanicsWarning),
    );
  });
});

describe("Persona page's hints for her own persona", () => {
  test("says {{name}} becomes her name in the parts of the system prompt alone", async () => {
    await renderPage(OWN_PERSONA.id);

    for (const label of [
      PERSONA_PARTS_COPY.voice.label,
      PERSONA_PARTS_COPY.role.label,
      PERSONA_PARTS_COPY.emptyMemory.label,
    ]) {
      expect(
        screen.getByRole("textbox", { name: label }),
      ).toHaveAccessibleDescription(expect.stringContaining("{{name}}"));
    }
    for (const label of [
      PERSONA_PARTS_COPY.searchManualTool.label,
      PERSONA_PARTS_COPY.openingKickoff.label,
      PERSONA_PARTS_COPY.answerNow.label,
    ]) {
      expect(
        screen.getByRole("textbox", { name: label }),
      ).not.toHaveAccessibleDescription(expect.stringContaining("{{name}}"));
    }
  });
});

describe("Persona page's fixed parts for her own persona", () => {
  test("shows the parts no persona changes", async () => {
    await renderPage(OWN_PERSONA.id);

    expect(screen.getByText(PERSONA_COPY.dynamicHeading)).toBeInTheDocument();
    expect(screen.getByText("search_manual: query")).toBeInTheDocument();
    expect(screen.getByText(MEMORY_TAGS)).toBeInTheDocument();
  });

  test("is not found for an id unknown or another user's", async () => {
    store.getUserPersona.mockResolvedValue(undefined);

    await expect(renderPage("not-a-persona")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("Persona page's mechanics parts for her own persona", () => {
  test("puts the mechanics parts and their resets, and only them, in the persona-mechanics extra", async () => {
    await renderPage(OWN_PERSONA.id);

    expect(renderedExtras()).toEqual(EXPECTED_EXTRAS);
    expect(
      screen
        .getByRole("button", {
          name: PERSONA_COPY.resetLabel(PERSONA_PARTS_COPY.citation.label),
        })
        .closest("[data-extra]"),
    ).toHaveAttribute("data-extra", "persona-mechanics");
  });
});
