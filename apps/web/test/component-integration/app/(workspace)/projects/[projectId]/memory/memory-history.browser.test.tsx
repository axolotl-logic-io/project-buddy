// A project's memory history in Chromium and WebKit: each version says who
// saved it, as the user viewing it reads it, so a team project's member
// never sees someone else's version as their own. Who is recorded is
// memory-savers.server.test.ts's.
import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
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
  { author: "buddy", savedBy: undefined, named: MEMORY_COPY.byBuddy },
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
  test("each version names its saver: you, another person, the buddy, or someone in the project", async () => {
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
