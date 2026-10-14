import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Button } from "@/components/ui/button.tsx";

const RETRY = "Retry";
const SAVE = "Save";
const RESTORE = "Restore";
const PROJECTS = "Your projects";

describe("Button", () => {
  test("is a primary button that never submits a form unless told to", () => {
    render(<Button>{RETRY}</Button>);

    const button = screen.getByRole("button", { name: RETRY });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("button-primary");
  });

  test("submits a form when its type says so", () => {
    render(<Button type="submit">{SAVE}</Button>);

    expect(screen.getByRole("button", { name: SAVE })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  test("takes its variant's look, with the caller's layout utilities", () => {
    render(
      <Button className="self-start" variant="quiet">
        {RESTORE}
      </Button>,
    );

    const button = screen.getByRole("button", { name: RESTORE });
    expect(button).toHaveClass("button-quiet", "self-start");
    expect(button).not.toHaveClass("button-primary");
  });

  test("styles its child as the button, so a link stays a link", () => {
    render(
      <Button asChild={true} variant="secondary">
        <a href="/projects">{PROJECTS}</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: PROJECTS });
    expect(link).toHaveAttribute("href", "/projects");
    expect(link).toHaveClass("button-secondary");
    expect(link).not.toHaveAttribute("type");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
