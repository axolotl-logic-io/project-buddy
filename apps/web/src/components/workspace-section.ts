import type { ReactNode } from "react";

// A tab that opens a menu of choices: the quest sidebar's Buckets. The
// section's content shows whichever choice is selected.
interface WorkspaceMenu {
  readonly label: string;
  readonly items: readonly { readonly id: string; readonly label: string }[];
  readonly value: string;
  readonly onValueChange: (id: string) => void;
}

interface WorkspaceSection {
  readonly id: string;
  readonly label: string;
  readonly content: ReactNode;
  readonly icon?: ReactNode;
  readonly description?: string;
  // A bucket goes in the quest sidebar's Buckets menu, not a tab of its own.
  readonly bucket?: boolean;
  readonly menu?: WorkspaceMenu;
}

export type { WorkspaceMenu, WorkspaceSection };
