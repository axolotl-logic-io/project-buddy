import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type {
  CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import { NewProjectForm } from "@/components/new-project-form.tsx";
import { userPersonaIdFixture } from "@/id-fixtures.ts";
import { listPersonas } from "@/personas/index.ts";
import type { OwnPersonaChoice } from "@/personas/persona-store.ts";
import { OPENING_COPY } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

const actions = vi.hoisted(() => ({
  createProjectAction: vi.fn<typeof createProjectAction>(),
}));
vi.mock("@/app/(workspace)/projects/actions.ts", () => actions);

const NEEDS_NAME: CreateProjectState = {
  kind: "invalid",
  message: PROJECTS_COPY.needsName,
};

// Her own personas, oldest first.
const OWN_PERSONAS: readonly OwnPersonaChoice[] = [
  { id: userPersonaIdFixture(), name: "Mr. Tee (copy)" },
  { id: userPersonaIdFixture(), name: "Fox Guide" },
];

// The form with her own personas loaded.
async function renderForm(): Promise<void> {
  const userPersonas = Promise.resolve(OWN_PERSONAS);
  // act returns a promise for an async callback; its conditional type hides
  // that from Biome, so it is named here.
  const loaded: Promise<void> = act(async () => {
    render(<NewProjectForm userPersonas={userPersonas} />);
    await userPersonas;
  });
  await loaded;
  await screen.findByRole("radio", { name: "Fox Guide" });
}

function personaRadio(name: string): HTMLElement {
  return screen.getByRole("radio", { name });
}

function nameField(): HTMLElement {
  return screen.getByRole("textbox", { name: PROJECTS_COPY.nameLabel });
}

function createButton(): HTMLElement {
  return screen.getByRole("button", { name: PROJECTS_COPY.create });
}

beforeEach(() => {
  vi.clearAllMocks();
  actions.createProjectAction.mockResolvedValue(NEEDS_NAME);
});

describe("NewProjectForm", () => {
  test("asks for the project's name", async () => {
    await renderForm();

    expect(nameField()).toHaveAttribute("name", "name");
    expect(nameField()).toBeRequired();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("NewProjectForm sending", () => {
  test("offers, in the interview-persona extra, the built-in personas then her own, with Hippy chosen", async () => {
    await renderForm();

    const group = screen.getByRole("radiogroup", {
      name: PROJECTS_COPY.personaLabel,
    });
    expect(group.closest('[data-extra="interview-persona"]')).not.toBeNull();
    expect(
      within(group)
        .getAllByRole("radio")
        .map((radio) => radio.textContent),
    ).toEqual([
      ...listPersonas().map((persona) => persona.name),
      "Mr. Tee (copy)",
      "Fox Guide",
    ]);
    expect(personaRadio("Hippy")).toBeChecked();
  });

  test("offers the built-in personas while her own load", () => {
    render(<NewProjectForm userPersonas={new Promise(() => undefined)} />);

    expect(screen.getAllByRole("radio")).toHaveLength(listPersonas().length);
    expect(personaRadio("Hippy")).toBeChecked();
  });

  test("sends the name and personaId=hippy", async () => {
    await renderForm();

    fireEvent.change(nameField(), { target: { value: "Low-poly fox" } });
    fireEvent.click(createButton());

    await screen.findByRole("alert");
    const [, sent] = actions.createProjectAction.mock.lastCall ?? [];
    expect(Object.fromEntries(sent ?? new FormData())).toEqual({
      name: "Low-poly fox",
      personaId: "hippy",
    });
  });
});

describe("NewProjectForm choosing a persona", () => {
  test("sends the id of her own persona when she chooses it", async () => {
    await renderForm();

    fireEvent.change(nameField(), { target: { value: "Low-poly fox" } });
    fireEvent.click(personaRadio("Fox Guide"));
    fireEvent.click(createButton());

    await screen.findByRole("alert");
    const [, sent] = actions.createProjectAction.mock.lastCall ?? [];
    expect(sent?.get("personaId")).toBe(OWN_PERSONAS[1]?.id);
  });
});

describe("NewProjectForm answers", () => {
  test("shows the message the action returns for a missing name", async () => {
    await renderForm();

    fireEvent.change(nameField(), { target: { value: "   " } });
    fireEvent.click(createButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      PROJECTS_COPY.needsName,
    );
  });

  test("shows the message the action returns for a persona not hers", async () => {
    actions.createProjectAction.mockResolvedValue({
      kind: "invalid",
      message: PROJECTS_COPY.choosePersona,
    });
    await renderForm();

    fireEvent.change(nameField(), { target: { value: "Low-poly fox" } });
    fireEvent.click(createButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      PROJECTS_COPY.choosePersona,
    );
  });
});

describe("NewProjectForm when Claude is unavailable", () => {
  test("says Claude is unavailable and keeps the name and persona she chose", async () => {
    const chosen = OWN_PERSONAS[1]?.id ?? userPersonaIdFixture();
    actions.createProjectAction.mockResolvedValue({
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      name: "Low-poly fox",
      personaId: chosen,
    });
    await renderForm();

    fireEvent.change(nameField(), { target: { value: "Low-poly fox" } });
    fireEvent.click(personaRadio("Fox Guide"));
    fireEvent.click(createButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      OPENING_COPY.claudeUnavailable,
    );
    expect(nameField()).toHaveValue("Low-poly fox");
    expect(personaRadio("Fox Guide")).toBeChecked();
    expect(personaRadio("Hippy")).not.toBeChecked();
  });

  test("says it is creating the project while the action runs", async () => {
    const { promise, resolve } = Promise.withResolvers<CreateProjectState>();
    actions.createProjectAction.mockReturnValue(promise);
    await renderForm();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    fireEvent.change(nameField(), { target: { value: "Low-poly fox" } });
    fireEvent.click(createButton());

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        PROJECTS_COPY.creating,
      );
    });
    expect(createButton()).toBeDisabled();
    resolve(NEEDS_NAME);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
