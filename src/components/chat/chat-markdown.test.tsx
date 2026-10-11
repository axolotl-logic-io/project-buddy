import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ChatMarkdown } from "@/components/chat/chat-markdown.tsx";

const KEY_TABLE = "| Key | Action |\n| --- | --- |\n| Ctrl+B | Bevel |";
const UNFINISHED_CODE = "Try this:\n\n```python\nimport bpy";
const MANUAL_LINK =
  "https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/bevel.html#usage";
const OTHER_LINK = "https://example.com/bevel";
const LINKS = `See [Bevel](${MANUAL_LINK}) or [a blog](${OTHER_LINK}).`;

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  test("opens manual links straight away and asks before other links", async () => {
    const open = vi.fn<Window["open"]>(() => null);
    vi.stubGlobal("open", open);
    render(<ChatMarkdown running={false} text={LINKS} />);

    fireEvent.click(screen.getByRole("button", { name: "Bevel" }));
    await waitFor(() => {
      expect(open).toHaveBeenCalledWith(MANUAL_LINK, "_blank", "noreferrer");
    });

    fireEvent.click(screen.getByRole("button", { name: "a blog" }));
    expect(await screen.findByText(OTHER_LINK)).toBeInTheDocument();
    expect(open).toHaveBeenCalledTimes(1);
  });
});
