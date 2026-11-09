import type { JSX } from "react";
import { vi } from "vitest";

import WorkspaceLayout from "@/app/(workspace)/layout.tsx";

vi.mock(
  "@/components/refresh-preferences.tsx",
  () => import("./refresh-preferences-test-kit.ts"),
);

vi.mock("@/batteries/catalog.ts", () => ({
  availableBatteryCatalog: () => [],
}));

function inWorkspace(content: JSX.Element): JSX.Element {
  return (
    <main className="flex flex-1 flex-col">
      <WorkspaceLayout header={null} params={Promise.resolve({})}>
        {content}
      </WorkspaceLayout>
    </main>
  );
}

export { inWorkspace };
