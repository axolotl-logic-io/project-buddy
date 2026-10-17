// "use_case_start_without_claude" in use-cases/, as she sees it in the
// new-project form: it shows it is working while the action runs, then says
// Claude is unavailable and keeps her name. That nothing is saved is
// src/chats/start-without-claude.server.test.ts's.
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import type {
  CreateProjectState,
  createProjectAction,
} from "@/app/(workspace)/projects/actions.ts";
import type { OwnBuddyChoice } from "@/buddies/buddy-store.ts";
import { DEFAULT_BUDDY_ID } from "@/buddies/index.ts";
import { NewProjectForm } from "@/components/new-project-form.tsx";
import { OPENING_COPY } from "@/ui/copy/chat.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";

const actions = vi.hoisted(() => ({
  createProjectAction: vi.fn<typeof createProjectAction>(),
}));
vi.mock("@/app/(workspace)/projects/actions.ts", () => actions);

const NAME = "Fox /mock-error overloaded_error";
const CLAUDE_UNAVAILABLE: CreateProjectState = {
  kind: "claudeUnavailable",
  message: OPENING_COPY.claudeUnavailable,
  name: NAME,
  buddyId: DEFAULT_BUDDY_ID,
};

// The form, once her own buddies, of which she has none, have loaded.
async function renderForm(): Promise<void> {
  const userBuddies: Promise<readonly OwnBuddyChoice[]> = Promise.resolve([]);
  // act returns a promise for an async callback; its conditional type hides
  // that from Biome, so it is named here.
  const loaded: Promise<void> = act(async () => {
    render(<NewProjectForm userBuddies={userBuddies} />);
    await userBuddies;
  });
  await loaded;
}

function nameField(): HTMLElement {
  return screen.getByRole("textbox", { name: PROJECTS_COPY.nameLabel });
}

function createButton(): HTMLElement {
  return screen.getByRole("button", { name: PROJECTS_COPY.create });
}

describe("use_case_start_without_claude", () => {
  test("a new project shows it is working, then says Claude is unavailable and keeps her name", async () => {
    const { promise, resolve } = Promise.withResolvers<CreateProjectState>();
    actions.createProjectAction.mockReturnValue(promise);
    await renderForm();

    fireEvent.change(nameField(), { target: { value: NAME } });
    fireEvent.click(createButton());

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        PROJECTS_COPY.creating,
      );
    });
    expect(createButton()).toBeDisabled();
    resolve(CLAUDE_UNAVAILABLE);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      OPENING_COPY.claudeUnavailable,
    );
    expect(nameField()).toHaveValue(NAME);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(createButton()).toBeEnabled();
  });
});
