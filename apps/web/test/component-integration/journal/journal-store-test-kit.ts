// Read-only workspace fixtures start with empty typed sections. Feature
// tests supply their own action results; real persistence has server tests.
import type { ProjectId, UserId } from "@/ids.ts";
import { emptySection, type SectionKind } from "@/journal/journal.ts";
import type { SectionState } from "@/journal/journal-store.ts";

function readSection(
  _owner: UserId,
  _projectId: ProjectId,
  kind: SectionKind,
): Promise<SectionState> {
  return Promise.resolve({
    version: 0,
    content: emptySection(kind),
    history: [],
  });
}

export { readSection };
