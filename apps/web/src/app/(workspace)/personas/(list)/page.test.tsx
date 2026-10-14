import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { SIGNED_IN_USER, signInAs } from "@/auth/current-user-test-kit.ts";
import { userPersonaIdFixture } from "@/id-fixtures.ts";
import { getPersona, listPersonas } from "@/personas/index.ts";
import type {
  listPersonas as listOwnPersonas,
  UserPersona,
} from "@/personas/persona-store.ts";
import { PERSONAS_COPY } from "@/ui/copy/personas.ts";
import PersonasPage, { metadata } from "./page.tsx";

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);

const store = vi.hoisted(() => ({
  listPersonas: vi.fn<typeof listOwnPersonas>(),
}));
vi.mock("@/personas/persona-store.ts", () => store);

const OWN_PERSONA: UserPersona = {
  id: userPersonaIdFixture(),
  name: "Mr. Tee (clone)",
  parts: getPersona("mr-tee").parts,
  clonedFrom: "mr-tee",
  createdAt: new Date("2026-10-12T09:00:00Z"),
  updatedAt: new Date("2026-10-12T09:00:00Z"),
};

// Hippy, Mr. Tee, Fjord Tines, Span Tines, Argon Sprangler and Roland
// Dustchain.
const BUILT_IN_PERSONA_COUNT = 6;

function section(name: string): HTMLElement {
  return screen.getByRole("region", { name });
}

function cardNames(region: HTMLElement): (string | null)[] {
  return within(region)
    .getAllByRole("listitem")
    .map((item) => item.firstElementChild?.textContent ?? null);
}

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  store.listPersonas.mockResolvedValue([OWN_PERSONA]);
});

describe("Personas page", () => {
  test("is titled Personas and links home", async () => {
    render(await PersonasPage());

    expect(metadata.title).toBe(PERSONAS_COPY.title);
    expect(
      screen.getByRole("heading", { level: 1, name: PERSONAS_COPY.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: PERSONAS_COPY.homeLink }),
    ).toHaveAttribute("href", "/");
  });

  test("lists the six built-in personas and her own", async () => {
    render(await PersonasPage());

    const builtIn = listPersonas().map((persona) => persona.name);
    expect(builtIn).toHaveLength(BUILT_IN_PERSONA_COUNT);
    expect(cardNames(section(PERSONAS_COPY.builtInHeading))).toEqual(builtIn);
    expect(cardNames(section(PERSONAS_COPY.ownHeading))).toEqual([
      OWN_PERSONA.name,
    ]);
    expect(store.listPersonas).toHaveBeenCalledWith(SIGNED_IN_USER.id);
  });

  test("says she has none of her own yet", async () => {
    store.listPersonas.mockResolvedValue([]);

    render(await PersonasPage());

    expect(
      within(section(PERSONAS_COPY.ownHeading)).getByText(PERSONAS_COPY.noOwn),
    ).toBeInTheDocument();
  });
});

describe("Personas page actions", () => {
  test("offers to customize each built-in persona, by its id", async () => {
    render(await PersonasPage());

    for (const persona of listPersonas()) {
      const button = screen.getByRole("button", {
        name: PERSONAS_COPY.customizeLabel(persona.name),
      });
      expect(button).toHaveTextContent(PERSONAS_COPY.customize);
      expect(button).toHaveAttribute("type", "submit");
      const form = button.closest("form");
      expect(form && new FormData(form).get("personaId")).toBe(persona.id);
      expect(
        screen.queryByRole("button", {
          name: PERSONAS_COPY.cloneLabel(persona.name),
        }),
      ).not.toBeInTheDocument();
    }
  });

  test("offers to tweak each of her own personas in place", async () => {
    render(await PersonasPage());

    const link = screen.getByRole("link", {
      name: PERSONAS_COPY.tweakLabel(OWN_PERSONA.name),
    });
    expect(link).toHaveTextContent(PERSONAS_COPY.tweak);
    expect(link).toHaveAttribute("href", `/personas/${OWN_PERSONA.id}`);
  });

  test("offers to clone each of her own personas, by its id", async () => {
    render(await PersonasPage());

    const button = screen.getByRole("button", {
      name: PERSONAS_COPY.cloneLabel(OWN_PERSONA.name),
    });
    expect(button).toHaveTextContent(PERSONAS_COPY.clone);
    expect(button).toHaveAttribute("type", "submit");
    const form = button.closest("form");
    expect(form && new FormData(form).get("sourceId")).toBe(OWN_PERSONA.id);
    expect(screen.getAllByRole("button")).toHaveLength(
      BUILT_IN_PERSONA_COUNT + [OWN_PERSONA].length,
    );
  });
});
