// A project's memory history in Chromium and WebKit: each version says who
// saved it, as the user viewing it reads it, so a team project's member
// never sees someone else's version as their own. Who is recorded is
// memory-savers.server.test.ts's.
import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  type MemoryFormState,
  restoreMemoryAction,
} from "@/app/(workspace)/projects/[projectId]/memory/actions.ts";
import { MemoryHistory } from "@/app/(workspace)/projects/[projectId]/memory/memory-history.tsx";
import {
  MEMORY_VERSION_NUMBER,
  type MemorySaver,
  type MemoryVersion,
} from "@/memory/memory.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { FOX_PROJECT } from "../../../page-fixtures.ts";

vi.mock("@/app/(workspace)/projects/[projectId]/memory/actions.ts", () => ({
  restoreMemoryAction: vi.fn(),
}));

// The history's versions, newest first: who saved each, and how the
// history names them.
const SAVERS: readonly {
  readonly author: MemoryVersion["author"];
  readonly savedBy: MemorySaver | undefined;
  readonly named: string;
}[] = [
  { author: "construct", savedBy: undefined, named: MEMORY_COPY.byConstruct },
  { author: "user", savedBy: { kind: "viewer" }, named: MEMORY_COPY.byUser },
  { author: "user", savedBy: { kind: "person", name: "Ada" }, named: "Ada" },
  { author: "user", savedBy: undefined, named: MEMORY_COPY.byUnnamedPerson },
];

const HISTORY: readonly MemoryVersion[] = SAVERS.map(
  ({ author, savedBy }, index) => ({
    version: MEMORY_VERSION_NUMBER.parse(SAVERS.length - index),
    text: `Text ${SAVERS.length - index}`,
    author,
    savedBy,
    createdAt: new Date("2026-10-11T09:00:00Z"),
  }),
);

describe("use_case_view_memory", () => {
  test("each version names its saver: you, another person, the construct, or someone in the project", async () => {
    await render(
      <MemoryHistory history={HISTORY} projectId={FOX_PROJECT.id} />,
    );

    const versions = page
      .getByRole("list", { name: MEMORY_COPY.historyHeading })
      .getByRole("listitem");
    await expect.element(versions.nth(SAVERS.length - 1)).toBeVisible();
    expect(versions.elements().map((version) => version.textContent)).toEqual(
      SAVERS.map(({ named }) => expect.stringContaining(`by ${named},`)),
    );
  });
});

test("restoring keeps its confirmation and focus when the history updates", async () => {
  const action = Promise.withResolvers<MemoryFormState>();
  vi.mocked(restoreMemoryAction).mockReturnValue(action.promise);
  const screen = await render(
    <MemoryHistory history={HISTORY} projectId={FOX_PROJECT.id} />,
  );
  const trigger = page.getByRole("button", {
    name: MEMORY_COPY.restore(1),
    exact: true,
  });
  await trigger.click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: MEMORY_COPY.restore(1), exact: true })
    .click();
  await expect.element(trigger).toBeDisabled();
  const newest: MemoryVersion = {
    version: MEMORY_VERSION_NUMBER.parse(HISTORY.length + 1),
    text: "Restored text",
    author: "user",
    savedBy: { kind: "viewer" },
    createdAt: new Date("2026-10-11T10:00:00Z"),
  };
  await screen.rerender(
    <MemoryHistory history={[newest, ...HISTORY]} projectId={FOX_PROJECT.id} />,
  );
  await expect.element(trigger).toBeDisabled();
  action.resolve({ kind: "saved" });
  await expect.element(page.getByText(MEMORY_COPY.restored(1))).toBeVisible();
  await expect.element(trigger).toHaveFocus();
  await screen.rerender(
    <MemoryHistory history={[newest, ...HISTORY]} projectId={FOX_PROJECT.id} />,
  );
  await expect.element(page.getByText(MEMORY_COPY.restored(1))).toBeVisible();
  await expect.element(trigger).toHaveFocus();
});

test("a later refused restore replaces an earlier success message", async () => {
  vi.mocked(restoreMemoryAction).mockResolvedValueOnce({ kind: "saved" });
  await render(<MemoryHistory history={HISTORY} projectId={FOX_PROJECT.id} />);
  await page
    .getByRole("button", { name: MEMORY_COPY.restore(1), exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: MEMORY_COPY.restore(1), exact: true })
    .click();
  await expect.element(page.getByText(MEMORY_COPY.restored(1))).toBeVisible();
  vi.mocked(restoreMemoryAction).mockResolvedValueOnce({ kind: "outdated" });
  await page
    .getByRole("button", { name: MEMORY_COPY.restore(2), exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: MEMORY_COPY.restore(2), exact: true })
    .click();
  await expect
    .element(page.getByText(MEMORY_COPY.restoreOutdated))
    .toBeVisible();
  await expect
    .element(page.getByText(MEMORY_COPY.restored(1)))
    .not.toBeInTheDocument();
});

test("only a recorded restore shows source provenance in Journal history", async () => {
  const [newest] = HISTORY;
  if (newest === undefined) {
    throw new Error("Missing history");
  }
  await render(
    <MemoryHistory
      history={[
        { ...newest, restoredFromVersion: MEMORY_VERSION_NUMBER.parse(1) },
        ...HISTORY.slice(1),
      ]}
      projectId={FOX_PROJECT.id}
    />,
  );
  await expect
    .element(page.getByText(MEMORY_COPY.restoredFrom(1)))
    .toBeVisible();
  expect(page.getByText(MEMORY_COPY.restoredFrom(1)).elements()).toHaveLength(
    1,
  );
});
