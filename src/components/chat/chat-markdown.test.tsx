import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ChatMarkdown } from "@/components/chat/chat-markdown.tsx";

const KEY_TABLE = "| Key | Action |\n| --- | --- |\n| Ctrl+B | Bevel |";
const UNFINISHED_CODE = "Try this:\n\n```python\nimport bpy";

describe("ChatMarkdown", () => {
  test("renders a GitHub table", () => {
    render(<ChatMarkdown running={false} text={KEY_TABLE} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Bevel" })).toBeInTheDocument();
  });

  test("renders an unfinished code fence as code while the text streams", async () => {
    render(<ChatMarkdown running={true} text={UNFINISHED_CODE} />);

    expect(
      await screen.findByText("import bpy", { exact: false }),
    ).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("```");
  });

  test("closes unfinished emphasis while the text streams", () => {
    render(<ChatMarkdown running={true} text="Press **Ctrl+B" />);

    expect(document.body).toHaveTextContent("Press Ctrl+B");
    expect(document.body).not.toHaveTextContent("**");
  });
});
