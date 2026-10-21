import type { JSX } from "react";
import WorkspaceLayout from "@/app/(workspace)/layout.tsx";

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
