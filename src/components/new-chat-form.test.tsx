import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type {
  StartChatState,
  startChatAction,
} from "@/app/(workspace)/chats/actions.ts";
import { NewChatForm } from "@/components/new-chat-form.tsx";
import { projectIdFixture } from "@/id-fixtures.ts";
import { listPersonas } from "@/personas/index.ts";
import type { Project } from "@/projects/store.ts";
import { COPY } from "@/ui/copy.ts";

const actions = vi.hoisted(() => ({
  startChatAction: vi.fn<typeof startChatAction>(),
}));
vi.mock("@/app/(workspace)/chats/actions.ts", () => actions);

const CHOOSE_PERSONA: StartChatState = {
  kind: "invalid",
  message: COPY.newChat.choosePersona,
};

const FOX_ID = projectIdFixture();
const DONUT_ID = projectIdFixture();
const projects: Project[] = [
  { id: FOX_ID, name: "Low-poly fox", createdAt: new Date() },
  { id: DONUT_ID, name: "Donut", createdAt: new Date() },
];

function startButton(): HTMLElement {
  return screen.getByRole("button", { name: COPY.newChat.start });
}

beforeEach(() => {
  vi.clearAllMocks();
  actions.startChatAction.mockResolvedValue(CHOOSE_PERSONA);
});

describe("NewChatForm", () => {
  test("offers every persona with Hippy preselected", () => {
    render(<NewChatForm projects={projects} />);

    for (const persona of listPersonas()) {
      expect(
        screen.getByRole("radio", { name: persona.name }),
      ).toBeInTheDocument();
    }
    expect(screen.getByRole("radio", { name: "Hippy" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Mr. Tee" })).not.toBeChecked();
  });

  test("submits persona ids as the radio values", () => {
    render(<NewChatForm projects={projects} />);

    expect(screen.getByRole("radio", { name: "Mr. Tee" })).toHaveAttribute(
      "value",
      "mr-tee",
    );
  });

  test("offers every project and preselects the given one", () => {
    render(<NewChatForm projects={projects} selectedProjectId={DONUT_ID} />);

    const select = screen.getByRole("combobox", { name: "Project" });
    expect(select).toHaveValue(DONUT_ID);
    expect(screen.getByRole("option", { name: "Low-poly fox" })).toHaveValue(
      FOX_ID,
    );
  });
});

describe("NewChatForm answers", () => {
  test("shows the message the action returns for a form it can't use", async () => {
    render(<NewChatForm projects={projects} />);

    fireEvent.click(startButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      COPY.newChat.choosePersona,
    );
  });

  test("says it is starting the chat while the action runs", async () => {
    const { promise, resolve } = Promise.withResolvers<StartChatState>();
    actions.startChatAction.mockReturnValue(promise);
    render(<NewChatForm projects={projects} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    fireEvent.click(startButton());

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        COPY.newChat.starting,
      );
    });
    expect(startButton()).toBeDisabled();
    resolve(CHOOSE_PERSONA);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
