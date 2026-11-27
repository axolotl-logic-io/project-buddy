import type { JSX } from "react";

import WorkspaceLayout from "@/app/(stream)/(site)/(workspace)/layout.tsx";

function inWorkspace(content: JSX.Element): JSX.Element {
  return (
    <main className="flex flex-1 flex-col">
      <WorkspaceLayout>
        {content}
      </WorkspaceLayout>
    </main>
  );
}

export { inWorkspace };
