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
import type { OwnBuddyChoice } from "@/buddies/buddy-store.ts";
import { listBuddies } from "@/buddies/index.ts";
import { NewProjectForm } from "@/components/new-project-form.tsx";
import { userBuddyIdFixture } from "@/id-fixtures.ts";
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

// Her own buddies, oldest first.
const OWN_BUDDIES: readonly OwnBuddyChoice[] = [
  { id: userBuddyIdFixture(), name: "Mr. Tee (clone)" },
  { id: userBuddyIdFixture(), name: "Fox Guide" },
];

// The form with her own buddies loaded.
async function renderForm(): Promise<void> {
  const userBuddies = Promise.resolve(OWN_BUDDIES);
  // act returns a promise for an async callback; its conditional type hides
  // that from Biome, so it is named here.
  const loaded: Promise<void> = act(async () => {
    render(<NewProjectForm userBuddies={userBuddies} />);
    await userBuddies;
  });
  await loaded;
  await screen.findByRole("radio", { name: "Fox Guide" });
}

function buddyRadio(name: string): HTMLElement {
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
  // "persona-mechanics" and "interview-persona" are stored flag ids (cookie and
  // account data), kept through the buddy rename (#116).
  test("offers, in the interview-persona extra, the built-in buddies then her own, with Hippy chosen", async () => {
    await renderForm();

    const group = screen.getByRole("radiogroup", {
      name: PROJECTS_COPY.buddyLabel,
    });
    expect(group.closest('[data-extra="interview-persona"]')).not.toBeNull();
    expect(
      within(group)
        .getAllByRole("radio")
        .map((radio) => radio.textContent),
    ).toEqual([
      ...listBuddies().map((buddy) => buddy.name),
      "Mr. Tee (clone)",
      "Fox Guide",
    ]);
    expect(buddyRadio("Hippy")).toBeChecked();
  });

  test("offers the built-in buddies while her own load", () => {
    render(<NewProjectForm userBuddies={new Promise(() => undefined)} />);

    expect(screen.getAllByRole("radio")).toHaveLength(listBuddies().length);
    expect(buddyRadio("Hippy")).toBeChecked();
  });

  test("sends the name and buddyId=hippy", async () => {
    await renderForm();

    fireEvent.change(nameField(), { target: { value: "Low-poly fox" } });
    fireEvent.click(createButton());

    await screen.findByRole("alert");
    const [, sent] = actions.createProjectAction.mock.lastCall ?? [];
    expect(Object.fromEntries(sent ?? new FormData())).toEqual({
      name: "Low-poly fox",
      buddyId: "hippy",
    });
  });
});

describe("NewProjectForm choosing a buddy", () => {
  test("sends the id of her own buddy when she chooses it", async () => {
    await renderForm();

    fireEvent.change(nameField(), { target: { value: "Low-poly fox" } });
    fireEvent.click(buddyRadio("Fox Guide"));
    fireEvent.click(createButton());

    await screen.findByRole("alert");
    const [, sent] = actions.createProjectAction.mock.lastCall ?? [];
    expect(sent?.get("buddyId")).toBe(OWN_BUDDIES[1]?.id);
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

  test("shows the message the action returns for a buddy not hers", async () => {
    actions.createProjectAction.mockResolvedValue({
      kind: "invalid",
      message: PROJECTS_COPY.chooseBuddy,
    });
    await renderForm();

    fireEvent.change(nameField(), { target: { value: "Low-poly fox" } });
    fireEvent.click(createButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      PROJECTS_COPY.chooseBuddy,
    );
  });
});

describe("NewProjectForm when Claude is unavailable", () => {
  test("says Claude is unavailable and keeps the name and buddy she chose", async () => {
    const chosen = OWN_BUDDIES[1]?.id ?? userBuddyIdFixture();
    actions.createProjectAction.mockResolvedValue({
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      name: "Low-poly fox",
      buddyId: chosen,
    });
    await renderForm();

    fireEvent.change(nameField(), { target: { value: "Low-poly fox" } });
    fireEvent.click(buddyRadio("Fox Guide"));
    fireEvent.click(createButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      OPENING_COPY.claudeUnavailable,
    );
    expect(nameField()).toHaveValue("Low-poly fox");
    expect(buddyRadio("Fox Guide")).toBeChecked();
    expect(buddyRadio("Hippy")).not.toBeChecked();
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
