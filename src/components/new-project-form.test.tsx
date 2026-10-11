import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import type { CreateProjectState } from "@/app/(workspace)/projects/actions.ts";
import { NewProjectForm } from "@/components/new-project-form.tsx";
import { COPY } from "@/ui/copy.ts";

vi.mock("@/app/(workspace)/projects/actions.ts", () => ({
  createProjectAction: vi.fn(
    async () =>
      ({
        kind: "invalid",
        message: COPY.projects.needsName,
      }) satisfies CreateProjectState,
  ),
}));

describe("NewProjectForm", () => {
  test("asks for the project's name", () => {
    render(<NewProjectForm />);

    const input = screen.getByRole("textbox", {
      name: COPY.projects.nameLabel,
    });
    expect(input).toHaveAttribute("name", "name");
    expect(input).toBeRequired();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("shows the message the action returns for a missing name", async () => {
    render(<NewProjectForm />);

    fireEvent.change(
      screen.getByRole("textbox", { name: COPY.projects.nameLabel }),
      { target: { value: "   " } },
    );
    fireEvent.click(screen.getByRole("button", { name: COPY.projects.create }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      COPY.projects.needsName,
    );
  });
});
