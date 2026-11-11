// The only storage boundary for typed Journal sections. Every write locks
// the owner's quest, so changes and undo serialize without lost versions.
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { projectOwnedBy } from "@/accounts/owner-scope.ts";
import { getDb, inTransaction } from "@/db/client.ts";
import { journalVersions } from "@/db/tables/journal-versions.ts";
import { projects } from "@/db/tables/projects-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { ProjectId, UserId } from "@/ids.ts";
import {
  applySectionEdit,
  CONTENT,
  type Content,
  emptySection,
  type SectionEdit,
  type SectionKind,
  sameContent,
} from "@/journal/journal.ts";

const VERSION = z.object({
  version: z.number().int().positive(),
  kind: z.enum(["goal", "preferences"]),
  content: CONTENT,
  before: CONTENT,
  author: z.enum(["person", "construct"]),
  undoesVersion: z.number().int().positive().nullable(),
  createdAt: z.date(),
});
type SectionVersion = z.infer<typeof VERSION>;
interface SectionState {
  readonly version: number;
  readonly content: Content;
  readonly history: readonly SectionVersion[];
}
type SectionResult =
  | {
      readonly status: "changed";
      readonly projectId: ProjectId;
      readonly state: SectionState;
    }
  | {
      readonly status: "not-changed";
      readonly reason: "outdated" | "invalid" | "unchanged" | "not-found";
      readonly state?: SectionState;
    };

function sectionState(
  kind: SectionKind,
  rows: readonly unknown[],
): SectionState {
  const history = z.array(VERSION).parse(rows);
  return {
    version: history[0]?.version ?? 0,
    content: history[0]?.content ?? emptySection(kind),
    history,
  };
}

function readSection(
  owner: UserId,
  projectId: ProjectId,
  kind: SectionKind,
): Promise<SectionState | undefined> {
  return withAppErrors("readJournalSection", async () => {
    const rows = await getDb()
      .select({ section: journalVersions })
      .from(projects)
      .leftJoin(
        journalVersions,
        and(
          eq(journalVersions.projectId, projects.id),
          eq(journalVersions.kind, kind),
        ),
      )
      .where(and(eq(projects.id, projectId), projectOwnedBy(owner)))
      .orderBy(desc(journalVersions.version));
    if (rows.length === 0) {
      return;
    }
    return sectionState(
      kind,
      rows.flatMap(({ section }) => {
        if (section === null) {
          return [];
        }
        return [section];
      }),
    );
  });
}

// Prompts need current content, never the full version history.
function readCurrentSections(
  owner: UserId,
  projectId: ProjectId,
): Promise<{ goal: Content | undefined; preferences: Content | undefined }> {
  return withAppErrors("readJournalSections", async () => {
    const rows = await getDb()
      .selectDistinctOn([journalVersions.kind], {
        content: journalVersions.content,
      })
      .from(journalVersions)
      .innerJoin(projects, eq(projects.id, journalVersions.projectId))
      .where(and(eq(projects.id, projectId), projectOwnedBy(owner)))
      .orderBy(journalVersions.kind, desc(journalVersions.version));
    const contents = rows.map(({ content }) => CONTENT.parse(content));
    return {
      goal: contents.find((content) => content.kind === "goal"),
      preferences: contents.find((content) => content.kind === "preferences"),
    };
  });
}

interface SectionChange {
  readonly projectId: ProjectId;
  readonly kind: SectionKind;
  readonly author: "person" | "construct";
  readonly basedOn?: number | undefined;
  readonly edit?: SectionEdit | undefined;
  readonly undo?: number | undefined;
}

// Undo restores only while the changed content is still current, refusing
// to overwrite later edits. History is never rewritten or deleted.
function writeSection(
  owner: UserId,
  change: SectionChange,
): Promise<SectionResult> {
  return withAppErrors("changeJournalSection", () =>
    inTransaction(async (tx): Promise<SectionResult> => {
      const { projectId, kind, author, basedOn } = change;
      const [quest] = await tx
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, projectId), projectOwnedBy(owner)))
        .for("update");
      if (quest === undefined) {
        return { status: "not-changed", reason: "not-found" };
      }
      const rows = await tx
        .select()
        .from(journalVersions)
        .where(
          and(
            eq(journalVersions.projectId, projectId),
            eq(journalVersions.kind, kind),
          ),
        )
        .orderBy(desc(journalVersions.version));
      const state = sectionState(kind, rows);
      if (basedOn !== undefined && basedOn !== state.version) {
        return { status: "not-changed", reason: "outdated", state };
      }
      let content: Content | undefined;
      if (change.undo !== undefined) {
        const version = state.history.find(
          (entry) => entry.version === change.undo,
        );
        if (
          version === undefined ||
          version.undoesVersion !== null ||
          state.history.some((entry) => entry.undoesVersion === change.undo)
        ) {
          return { status: "not-changed", reason: "invalid", state };
        }
        if (!sameContent(state.content, version.content)) {
          return { status: "not-changed", reason: "outdated", state };
        }
        content = version.before;
        if (
          content.kind === "preferences" &&
          state.content.kind === "preferences"
        ) {
          content = {
            ...content,
            nextNumber: Math.max(content.nextNumber, state.content.nextNumber),
          };
        }
      } else if (change.edit !== undefined) {
        content = applySectionEdit(state.content, change.edit);
      }
      if (content === undefined) {
        return { status: "not-changed", reason: "invalid", state };
      }
      if (sameContent(content, state.content)) {
        return { status: "not-changed", reason: "unchanged", state };
      }
      let userId: UserId | null = null;
      if (author === "person") {
        userId = owner;
      }
      const [saved] = await tx
        .insert(journalVersions)
        .values({
          projectId,
          kind,
          version: state.version + 1,
          content,
          before: state.content,
          author,
          userId,
          undoesVersion: change.undo ?? null,
        })
        .returning();
      return {
        status: "changed",
        projectId,
        state: sectionState(kind, [saved, ...rows]),
      };
    }),
  );
}

export type { SectionChange, SectionResult, SectionState, SectionVersion };
export { readCurrentSections, readSection, writeSection };
