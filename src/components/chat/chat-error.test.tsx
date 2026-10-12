import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ChatError } from "@/components/chat/chat-error.tsx";
import { userMessage } from "@/errors/app-error.ts";
import { quotaUsedUpMessage } from "@/quota/quota-terms.ts";
import { PROBLEMS_COPY } from "@/ui/copy/problems.ts";

afterEach(() => {
  vi.useRealTimers();
});

describe("ChatError", () => {
  test("shows the case's message, without a sign-in link", () => {
    render(<ChatError error={new Error("overloaded")} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      userMessage("overloaded"),
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  test("is the site's boxed alert", () => {
    render(<ChatError error={new Error("overloaded")} />);

    expect(screen.getByRole("alert")).toHaveClass("error-text", "error-box");
  });

  test("links to the passphrase page when she was signed out", () => {
    render(<ChatError error={new Error("signed-out")} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      userMessage("signed-out"),
    );
    const link = screen.getByRole("link", { name: PROBLEMS_COPY.signInLink });
    expect(link).toHaveAttribute("href", "/login");
    expect(link).toHaveClass("text-link");
  });

  test("when her quota is used up, names the 1st of next month in UTC as its reset", () => {
    vi.useFakeTimers({
      now: new Date("2026-10-31T23:59:59Z"),
      toFake: ["Date"],
    });

    render(<ChatError error={new Error("quota-used-up")} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      quotaUsedUpMessage(new Date("2026-11-01T00:00:00Z")),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("November 1, 2026");
  });

  test("shows the unknown message for any other text", () => {
    render(<ChatError error={new Error("Unauthorized")} />);

    expect(screen.getByRole("alert")).toHaveTextContent(userMessage("unknown"));
  });
});
