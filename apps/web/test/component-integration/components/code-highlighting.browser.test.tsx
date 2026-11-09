import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import { Markdown } from "@/components/markdown.tsx";
import { applyTheme } from "../themes/theme-test-kit.ts";

afterEach(cleanup);

function codeColors(): number {
  return new Set(
    Array.from(
      document.querySelectorAll("code span"),
      (span) => getComputedStyle(span).color,
    ),
  ).size;
}

test("the first code block becomes highlighted without preloading the engine", async () => {
  applyTheme("parchment");
  await render(
    <Markdown
      text={["```python", "print(1)", "```"].join("\n")}
      running={false}
    />,
  );
  await expect.element(page.getByText("print(1)")).toBeVisible();
  await expect.poll(codeColors).toBeGreaterThan(1);
});
