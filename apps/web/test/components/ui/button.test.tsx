import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { Button } from "@/components/ui/button.tsx";

const RETRY = "Retry";
const SAVE = "Save";
const PROJECTS = "Your projects";

describe("Button", () => {
  test("is a primary button that never submits a form unless told to", () => {
    const submitted = vi.fn<(event: React.FormEvent<HTMLFormElement>) => void>(
      (event) => {
        event.preventDefault();
      },
    );
    render(
      <form onSubmit={submitted}>
        <Button>{RETRY}</Button>
        <Button type="submit">{SAVE}</Button>
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: RETRY }));
    expect(submitted).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: SAVE }));
    expect(submitted).toHaveBeenCalledOnce();

    const button = screen.getByRole("button", { name: RETRY });
    expect(button).toHaveAttribute("type", "button");
  });

  test("styles its child as the button, so a link stays a link", () => {
    render(
      <Button asChild={true} variant="secondary">
        <a href="/projects">{PROJECTS}</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: PROJECTS });
    expect(link).toHaveAttribute("href", "/projects");
    expect(link).not.toHaveAttribute("type");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
