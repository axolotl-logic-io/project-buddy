import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type {
  CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import { NewProjectForm } from "@/components/new-project-form.tsx";
import { DEFAULT_PERSONA_ID, listPersonas } from "@/personas/index.ts";
import { COPY } from "@/ui/copy.ts";

const actions = vi.hoisted(() => ({
  createProjectAction: vi.fn<typeof createProjectAction>(),
}));
vi.mock("@/app/(workspace)/projects/actions.ts", () => actions);

const NEEDS_NAME: CreateProjectState = {
  kind: "invalid",
  message: COPY.projects.needsName,
};

function nameField(): HTMLElement {
  return screen.getByRole("textbox", { name: COPY.projects.nameLabel });
}

function createButton(): HTMLElement {
  return screen.getByRole("button", { name: COPY.projects.create });
}

beforeEach(() => {
  vi.clearAllMocks();
  actions.createProjectAction.mockResolvedValue(NEEDS_NAME);
});

describe("NewProjectForm", () => {
  test("asks for the project's name", () => {
    render(<NewProjectForm />);

    expect(nameField()).toHaveAttribute("name", "name");
    expect(nameField()).toBeRequired();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("offers every persona for the first chat, the default chosen", () => {
    render(<NewProjectForm />);

    for (const persona of listPersonas()) {
      const radio = screen.getByRole("radio", { name: persona.name });
      expect(radio).toHaveAttribute("name", "personaId");
      expect(radio).toHaveAttribute("value", persona.id);
      expect(radio.matches(":checked")).toBe(persona.id === DEFAULT_PERSONA_ID);
    }
  });

  test("shows the message the action returns for a missing name", async () => {
    render(<NewProjectForm />);

    fireEvent.change(nameField(), { target: { value: "   " } });
    fireEvent.click(createButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      COPY.projects.needsName,
    );
  });

  test("says it is creating the project while the action runs", async () => {
    const { promise, resolve } = Promise.withResolvers<CreateProjectState>();
    actions.createProjectAction.mockReturnValue(promise);
    render(<NewProjectForm />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    fireEvent.change(nameField(), { target: { value: "Low-poly fox" } });
    fireEvent.click(createButton());

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        COPY.interview.creating,
      );
    });
    expect(createButton()).toBeDisabled();
    resolve(NEEDS_NAME);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
