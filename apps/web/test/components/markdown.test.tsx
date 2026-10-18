import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { Markdown } from "@/components/markdown.tsx";

const KEY_TABLE = "| Key | Action |\n| --- | --- |\n| Ctrl+B | Bevel |";
const PYTHON_CODE = "```python\nimport bpy\n```";
const UNFINISHED_CODE = "Try this:\n\n```python\nimport bpy";
const MANUAL_LINK =
  "https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/bevel.html#usage";
const OTHER_LINK = "https://example.com/bevel";
const LINKS = `See [Bevel](${MANUAL_LINK}) or [a blog](${OTHER_LINK}).`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Markdown", () => {
  test("renders a GitHub table", () => {
    render(<Markdown running={false} text={KEY_TABLE} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Bevel" })).toBeInTheDocument();
  });

  test("renders an unfinished code fence as code while the text streams", async () => {
    render(<Markdown running={true} text={UNFINISHED_CODE} />);

    expect(
      await screen.findByText("import bpy", { exact: false }),
    ).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("```");
  });

  test("colours code with the contract's code tokens in either mode", async () => {
    render(<Markdown running={false} text={PYTHON_CODE} />);

    const keyword = await screen.findByText("import");
    await waitFor(() => {
      expect(keyword.style.getPropertyValue("--sdm-c")).toBe(
        "var(--code-keyword)",
      );
    });
    expect(keyword.style.getPropertyValue("--shiki-dark")).toBe(
      "var(--code-keyword)",
    );
  });

  test("closes unfinished emphasis while the text streams", () => {
    render(<Markdown running={true} text="Press **Ctrl+B" />);

    expect(document.body).toHaveTextContent("Press Ctrl+B");
    expect(document.body).not.toHaveTextContent("**");
  });

  test("opens manual links straight away and asks before other links", async () => {
    const open = vi.fn<Window["open"]>(() => null);
    vi.stubGlobal("open", open);
    render(<Markdown running={false} text={LINKS} />);

    fireEvent.click(screen.getByRole("button", { name: "Bevel" }));
    await waitFor(() => {
      expect(open).toHaveBeenCalledWith(MANUAL_LINK, "_blank", "noreferrer");
    });

    fireEvent.click(screen.getByRole("button", { name: "a blog" }));
    expect(await screen.findByText(OTHER_LINK)).toBeInTheDocument();
    expect(open).toHaveBeenCalledTimes(1);
  });
});
