import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewChatForm } from "@/components/new-chat-form";
import { listPersonas } from "@/personas";

vi.mock("@/app/chats/actions", () => ({ startChatAction: vi.fn() }));

const projects = [
  { id: "p1", name: "Low-poly fox", createdAt: new Date() },
  { id: "p2", name: "Donut", createdAt: new Date() },
];

describe("NewChatForm", () => {
  it("offers every persona with Hippy preselected", () => {
    render(<NewChatForm projects={projects} />);

    for (const persona of listPersonas()) {
      expect(
        screen.getByRole("radio", { name: persona.name }),
      ).toBeInTheDocument();
    }
    expect(screen.getByRole("radio", { name: "Hippy" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Mr. T" })).not.toBeChecked();
  });

  it("submits persona ids as the radio values", () => {
    render(<NewChatForm projects={projects} />);

    expect(screen.getByRole("radio", { name: "Mr. T" })).toHaveAttribute(
      "value",
      "mr-t",
    );
  });

  it("offers every project and preselects the given one", () => {
    render(<NewChatForm projects={projects} selectedProjectId="p2" />);

    const select = screen.getByRole("combobox", { name: "Project" });
    expect(select).toHaveValue("p2");
    expect(screen.getByRole("option", { name: "Low-poly fox" })).toHaveValue(
      "p1",
    );
  });
});
