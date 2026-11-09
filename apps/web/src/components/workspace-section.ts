import type { ReactNode } from "react";

interface WorkspaceSection {
  readonly id: string;
  readonly label: string;
  readonly content: ReactNode;
}

export type { WorkspaceSection };
