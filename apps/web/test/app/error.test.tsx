import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import ErrorBoundary from "@/app/error.tsx";
import { AppError, userMessage } from "@/errors/app-error.ts";
import { PROBLEMS_COPY } from "@/ui/copy/problems.ts";

const { reloadForNewerBuild } = vi.hoisted(() => ({
  reloadForNewerBuild: vi.fn<() => boolean>(() => false),
}));
vi.mock("@/errors/newer-build-reload.ts", () => ({ reloadForNewerBuild }));

afterEach(() => {
  reloadForNewerBuild.mockClear();
});

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
      userMessage("database-unreachable"),
    );
  });

  test("shows the case message for a redacted server error that kept the digest", () => {
    const redacted = Object.assign(new Error("An error occurred."), {
      digest: "database-unreachable",
    });

    render(<ErrorBoundary error={redacted} retry={noRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      userMessage("database-unreachable"),
    );
  });

  test("shows the unknown message for any other error, never its text", () => {
    const other = Object.assign(new Error("secret detail"), {
      digest: "2071459210",
    });

    render(<ErrorBoundary error={other} retry={noRetry} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(userMessage("unknown"));
    expect(alert).not.toHaveTextContent("secret detail");
  });

  test("retries, and links back to the projects", () => {
    const retry = vi.fn<() => void>();
    render(<ErrorBoundary error={new Error("x")} retry={retry} />);

    fireEvent.click(screen.getByRole("button", { name: PROBLEMS_COPY.retry }));

    expect(retry).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("link", { name: PROBLEMS_COPY.projectsLink }),
    ).toHaveAttribute("href", "/projects");
  });
});

describe("ErrorBoundary on a build older than the server's", () => {
  test("reloads once for a digest naming a case this build doesn't know, showing the unknown message", () => {
    const newer = Object.assign(new Error("An error occurred."), {
      digest: "some-future-case",
    });

    render(<ErrorBoundary error={newer} retry={noRetry} />);

    expect(reloadForNewerBuild).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert")).toHaveTextContent(userMessage("unknown"));
  });

  test("doesn't reload for a case this build knows or a digest Next made", () => {
    for (const digest of ["database-unreachable", "unknown", "2071459210"]) {
      const error = Object.assign(new Error("x"), { digest });
      render(<ErrorBoundary error={error} retry={noRetry} />);
    }

    expect(reloadForNewerBuild).not.toHaveBeenCalled();
  });
});
