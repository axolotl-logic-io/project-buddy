import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import type { StartChatState } from "@/app/(workspace)/chats/actions.ts";
import { NewChatForm } from "@/components/new-chat-form.tsx";
import { projectIdFixture } from "@/id-fixtures.ts";
import { listPersonas } from "@/personas/index.ts";
import type { Project } from "@/projects/store.ts";
import { COPY } from "@/ui/copy.ts";

vi.mock("@/app/(workspace)/chats/actions.ts", () => ({
  startChatAction: vi.fn(
    async () =>
      ({
        kind: "invalid",
        message: COPY.newChat.choosePersona,
      }) satisfies StartChatState,
  ),
}));

const FOX_ID = projectIdFixture();
const DONUT_ID = projectIdFixture();
const projects: Project[] = [
  { id: FOX_ID, name: "Low-poly fox", createdAt: new Date() },
  { id: DONUT_ID, name: "Donut", createdAt: new Date() },
];

describe("NewChatForm", () => {
  test("offers every persona with Hippy preselected", () => {
    render(<NewChatForm projects={projects} />);

    for (const persona of listPersonas()) {
      expect(
        screen.getByRole("radio", { name: persona.name }),
      ).toBeInTheDocument();
    }
    expect(screen.getByRole("radio", { name: "Hippy" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Mr. T" })).not.toBeChecked();
  });

  test("submits persona ids as the radio values", () => {
    render(<NewChatForm projects={projects} />);

    expect(screen.getByRole("radio", { name: "Mr. T" })).toHaveAttribute(
      "value",
      "mr-t",
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

  test("shows the message the action returns for a form it can't use", async () => {
    render(<NewChatForm projects={projects} />);

    fireEvent.click(screen.getByRole("button", { name: COPY.newChat.start }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      COPY.newChat.choosePersona,
    );
  });
});
