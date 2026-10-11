import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ChatError } from "@/components/chat/chat-error.tsx";
import { userMessage } from "@/errors/app-error.ts";
import { COPY } from "@/ui/copy.ts";

describe("ChatError", () => {
  test("shows the case's message, without a sign-in link", () => {
    render(<ChatError error={new Error("overloaded")} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      userMessage("overloaded"),
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  test("links to the passphrase page when she was signed out", () => {
    render(<ChatError error={new Error("signed-out")} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      userMessage("signed-out"),
    );
    expect(
      screen.getByRole("link", { name: COPY.problems.signInLink }),
    ).toHaveAttribute("href", "/login");
  });

  test("shows the unknown message for any other text", () => {
    render(<ChatError error={new Error("Unauthorized")} />);

    expect(screen.getByRole("alert")).toHaveTextContent(userMessage("unknown"));
  });
});
