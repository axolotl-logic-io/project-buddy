import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type {
  StartChatState,
  startChatAction,
} from "@/app/(workspace)/chats/actions.ts";
import { NewChatForm } from "@/components/new-chat-form.tsx";
import { projectIdFixture } from "@/id-fixtures.ts";
import {
  DEFAULT_PERSONA_ID,
  getPersona,
  listPersonas,
} from "@/personas/index.ts";
import type { Project } from "@/projects/store.ts";
import { NEW_CHAT_COPY, OPENING_COPY } from "@/ui/copy/chat.ts";

const DEFAULT_PERSONA_NAME: string = getPersona(DEFAULT_PERSONA_ID).name;
const MR_TEE_NAME: string = getPersona("mr-tee").name;

const actions = vi.hoisted(() => ({
  startChatAction: vi.fn<typeof startChatAction>(),
}));
vi.mock("@/app/(workspace)/chats/actions.ts", () => actions);

const CHOOSE_PERSONA: StartChatState = {
  kind: "invalid",
  message: NEW_CHAT_COPY.choosePersona,
};

const FOX_ID = projectIdFixture();
const DONUT_ID = projectIdFixture();
const projects: Project[] = [
  {
    id: FOX_ID,
    name: "Low-poly fox",
    interviewChatId: undefined,
    createdAt: new Date(),
  },
  {
    id: DONUT_ID,
    name: "Donut",
    interviewChatId: undefined,
    createdAt: new Date(),
  },
];

function startButton(): HTMLElement {
  return screen.getByRole("button", { name: NEW_CHAT_COPY.start });
}

beforeEach(() => {
  vi.clearAllMocks();
  actions.startChatAction.mockResolvedValue(CHOOSE_PERSONA);
});

describe("NewChatForm", () => {
  test("offers every persona with the default one preselected", () => {
    render(<NewChatForm projects={projects} />);

    for (const persona of listPersonas()) {
      expect(
        screen.getByRole("radio", { name: persona.name }),
      ).toBeInTheDocument();
    }
    expect(
      screen.getByRole("radio", { name: DEFAULT_PERSONA_NAME }),
    ).toBeChecked();
    expect(screen.getByRole("radio", { name: MR_TEE_NAME })).not.toBeChecked();
  });

  test("submits persona ids as the radio values", () => {
    render(<NewChatForm projects={projects} />);

    expect(screen.getByRole("radio", { name: MR_TEE_NAME })).toHaveAttribute(
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
      NEW_CHAT_COPY.choosePersona,
    );
  });

  test("says Claude is unavailable and keeps her project and persona", async () => {
    actions.startChatAction.mockResolvedValue({
      kind: "claudeUnavailable",
      message: OPENING_COPY.claudeUnavailable,
      projectId: DONUT_ID,
      personaId: "mr-tee",
    });
    render(<NewChatForm projects={projects} />);

    fireEvent.change(screen.getByRole("combobox", { name: "Project" }), {
      target: { value: DONUT_ID },
    });
    fireEvent.click(screen.getByRole("radio", { name: MR_TEE_NAME }));
    fireEvent.click(startButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      OPENING_COPY.claudeUnavailable,
    );
    expect(screen.getByRole("combobox", { name: "Project" })).toHaveValue(
      DONUT_ID,
    );
    expect(screen.getByRole("radio", { name: MR_TEE_NAME })).toBeChecked();
  });

  test("says it is starting the chat while the action runs", async () => {
    const { promise, resolve } = Promise.withResolvers<StartChatState>();
    actions.startChatAction.mockReturnValue(promise);
    render(<NewChatForm projects={projects} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    fireEvent.click(startButton());

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        NEW_CHAT_COPY.starting,
      );
    });
    expect(startButton()).toBeDisabled();
    resolve(CHOOSE_PERSONA);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
