import type { JSX } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { commands, page } from "vitest/browser";
import { render } from "vitest-browser-react";
import SegmentError from "@/app/(workspace)/constructs/[constructId]/error.tsx";
import { EditorLoading } from "@/components/ui/editor-loading.tsx";
import { EditorFrame } from "@/components/ui/page-frame.tsx";
import { PROBLEMS_COPY } from "@/ui/copy/problems.ts";
import { applyTheme } from "../../themes/theme-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
  setViewport,
} from "../../viewports-test-kit.ts";

const COPY = { navigation: "Navigation", heading: "Editor", prompt: "Prompt" };
const STANDARD_WIDTH = 768;

function shell(content: JSX.Element): JSX.Element {
  return (
    <>
      <header>
        <a href="/projects">{COPY.navigation}</a>
      </header>
      <main className="flex flex-1 flex-col">
        <div className="workspace-frame">{content}</div>
      </main>
    </>
  );
}

afterEach(async () => {
  await setViewport(LAPTOP_VIEWPORT);
});

describe.each(["light", "dark"])("page frames in %s", (mode) => {
  beforeEach(() => {
    applyTheme("parchment", mode);
  });
  test("keeps the editor surface wide before the form arrives with reduced motion", async () => {
    await setViewport(LAPTOP_VIEWPORT);
    await commands.reduceMotion();
    const screen = await render(
      shell(
        <EditorFrame>
          <EditorLoading label="Loading editor" />
        </EditorFrame>,
      ),
    );
    const status = page.getByRole("status");
    const frame = status.element().closest("main")
      ?.firstElementChild?.firstElementChild;
    expect(frame).toBeInstanceOf(HTMLElement);
    const before = frame?.getBoundingClientRect();
    const block = status.element().querySelector('[aria-hidden="true"] > div');
    expect(block).not.toBeNull();
    if (block === null) {
      throw new Error("Missing decorative loading block");
    }
    expect(getComputedStyle(block).animationName).toBe("none");
    await screen.rerender(
      shell(
        <EditorFrame>
          <h1>{COPY.heading}</h1>
          <label>
            {COPY.prompt}
            <textarea />
          </label>
        </EditorFrame>,
      ),
    );
    expect(frame?.getBoundingClientRect().width).toEqual(before?.width);
    expect(frame?.getBoundingClientRect().x).toEqual(before?.x);
    expect(before?.width).toBeGreaterThan(STANDARD_WIDTH);
    await expect
      .element(page.getByRole("textbox", { name: "Prompt" }))
      .toBeVisible();
  });
  test("retains editor width and navigation when its segment fails and can retry", async () => {
    await setViewport(LAPTOP_VIEWPORT);
    const retry = vi.fn<() => void>();
    const screen = await render(
      shell(
        <EditorFrame>
          <EditorLoading label="Loading editor" />
        </EditorFrame>,
      ),
    );
    const frame = page.getByRole("main").element()
      .firstElementChild?.firstElementChild;
    const before = frame?.getBoundingClientRect();
    await screen.rerender(
      shell(
        <EditorFrame>
          <SegmentError
            error={new Error("Private server detail")}
            retry={retry}
          />
        </EditorFrame>,
      ),
    );
    expect(frame?.getBoundingClientRect().width).toEqual(before?.width);
    expect(frame?.getBoundingClientRect().x).toEqual(before?.x);
    await expect.element(page.getByRole("alert")).toBeVisible();
    await expect
      .element(page.getByText("Private server detail"))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("link", { name: COPY.navigation }))
      .toBeVisible();
    await page.getByRole("button", { name: PROBLEMS_COPY.retry }).click();
    expect(retry).toHaveBeenCalledOnce();
  });

  test.each([NARROWEST_VIEWPORT, PHONE_VIEWPORT])(
    "fits the editor error frame at $width px",
    async (viewport) => {
      await setViewport(viewport);
      const screen = await render(
        shell(
          <EditorFrame>
            <EditorLoading label="Loading editor" />
          </EditorFrame>,
        ),
      );
      const navigation = page.getByRole("link", { name: COPY.navigation });
      navigation.element().focus();
      await screen.rerender(
        shell(
          <EditorFrame>
            <SegmentError
              error={new Error("Private server detail")}
              retry={vi.fn()}
            />
          </EditorFrame>,
        ),
      );
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        viewport.width,
      );
      expect(navigation.element()).toHaveFocus();
      const retry = page
        .getByRole("button", { name: PROBLEMS_COPY.retry })
        .element()
        .getBoundingClientRect();
      expect(retry.left).toBeGreaterThanOrEqual(0);
      expect(retry.right).toBeLessThanOrEqual(viewport.width);
    },
  );
});
