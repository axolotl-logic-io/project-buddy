import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import ErrorBoundary from "@/app/error.tsx";
import { AppError, userMessageForCase } from "@/errors/app-error.ts";
import { COPY } from "@/ui/copy.ts";

function noRetry(): void {
  // These tests don't retry.
}

describe("ErrorBoundary", () => {
  test("shows the case message of an AppError, read from its digest", () => {
    render(
      <ErrorBoundary
        error={new AppError("database-unreachable", new Error("x"))}
        retry={noRetry}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      userMessageForCase("database-unreachable"),
    );
  });

  test("shows the case message for a redacted server error that kept the digest", () => {
    const redacted = Object.assign(new Error("An error occurred."), {
      digest: "database-unreachable",
    });

    render(<ErrorBoundary error={redacted} retry={noRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      userMessageForCase("database-unreachable"),
    );
  });

  test("shows the unknown message for any other error, never its text", () => {
    const other = Object.assign(new Error("secret detail"), {
      digest: "2071459210",
    });

    render(<ErrorBoundary error={other} retry={noRetry} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(userMessageForCase("unknown"));
    expect(alert).not.toHaveTextContent("secret detail");
  });

  test("retries, and links back to the projects", () => {
    const retry = vi.fn<() => void>();
    render(<ErrorBoundary error={new Error("x")} retry={retry} />);

    fireEvent.click(screen.getByRole("button", { name: COPY.problems.retry }));

    expect(retry).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("link", { name: COPY.problems.projectsLink }),
    ).toHaveAttribute("href", "/projects");
  });
});
