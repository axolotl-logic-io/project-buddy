import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";

const NEEDS_NAME = "A project needs a name.";
const SAVED = "Saved.";

describe("Alert", () => {
  test("is read out as soon as it appears, in line by default", () => {
    render(<Alert>{NEEDS_NAME}</Alert>);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(NEEDS_NAME);
    expect(alert).toHaveClass("error-text");
    expect(alert).not.toHaveClass("error-box");
  });

  test("stands apart from what surrounds it when boxed", () => {
    render(<Alert boxed={true}>{NEEDS_NAME}</Alert>);

    expect(screen.getByRole("alert")).toHaveClass("error-text", "error-box");
  });
});

describe("FormStatus", () => {
  test("announces each change of what the form did", () => {
    render(<FormStatus>{SAVED}</FormStatus>);

    expect(screen.getByRole("status")).toHaveTextContent(SAVED);
  });
});
