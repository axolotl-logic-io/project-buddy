// One explicit data operation, separate from schema migrations. Both version
// inserts commit together; a concurrent edit rolls the quest back for retry.
import { and, desc, eq } from "drizzle-orm";
import { inTransaction } from "../db/client.ts";
import { memoryVersions } from "../db/tables/memory-versions.ts";
import { planVersions } from "../db/tables/plan-versions.ts";
import { projects } from "../db/tables/projects-and-chats.ts";
import { PLAN, PLAN_STEP_TEXT } from "../plan/plan.ts";
import { EMPTY_MEMORY } from "./memory.ts";
import { nextStepOf } from "./next-step.ts";

// Keeps every byte outside the matching line, including historical notes.
const LINES = /[^\r\n]*(?:\r\n|\n|\r|$)/gu;

function movedNextStep(
  text: string,
): { step: string; text: string } | undefined {
  const match = [...text.matchAll(LINES)].find(
    (line) =>
      nextStepOf({ text: line[0], version: EMPTY_MEMORY.version }) !==
      undefined,
  );
  if (match !== undefined) {
    const parsed = PLAN_STEP_TEXT.safeParse(
      nextStepOf({ text: match[0], version: EMPTY_MEMORY.version }),
    );
    if (parsed.success) {
      return {
        step: parsed.data,
        text:
          text.slice(0, match.index) +
          text.slice(match.index + match[0].length),
      };
    }
  }
  return undefined;
}

// Run after the plan-reading release is live. dryRun makes no writes.
function migrateNextSteps(dryRun: boolean): Promise<number> {
  return inTransaction(async (tx): Promise<number> => {
    const quests = await tx.select({ id: projects.id }).from(projects);
    const moved = await Promise.all(
      quests.map(async (quest): Promise<0 | 1> => {
        const [memory] = await tx
          .select()
          .from(memoryVersions)
          .where(eq(memoryVersions.projectId, quest.id))
          .orderBy(desc(memoryVersions.version))
          .limit(1);
        const [latest] = await tx
          .select()
          .from(planVersions)
          .where(eq(planVersions.projectId, quest.id))
          .orderBy(desc(planVersions.version))
          .limit(1);
        if (memory === undefined) {
          return 0;
        }
        const plan = PLAN.parse(latest?.plan ?? { steps: [], nextNumber: 1 });
        // Previously emptied plans deliberately have no next step.
        if (plan.steps.length > 0 || plan.nextNumber !== 1) {
          return 0;
        }
        const move = movedNextStep(memory.text);
        if (move === undefined) {
          return 0;
        }
        if (dryRun) {
          return 1;
        }
        // Lock existing history against edits during this operation. Unique
        // version indexes also reject writers that read before this lock.
        await tx
          .select({ id: memoryVersions.id })
          .from(memoryVersions)
          .where(
            and(
              eq(memoryVersions.projectId, quest.id),
              eq(memoryVersions.version, memory.version),
            ),
          )
          .for("update");
        await tx.insert(planVersions).values({
          projectId: quest.id,
          version: (latest?.version ?? 0) + 1,
          plan: {
            steps: [{ number: 1, text: move.step, done: false }],
            nextNumber: 2,
          },
          lines: [{ kind: "add", text: move.step }],
          undo: [{ op: "remove", step: 1 }],
          author: "construct",
        });
        await tx.insert(memoryVersions).values({
          projectId: quest.id,
          version: memory.version + 1,
          text: move.text,
          author: "buddy",
        });
        return 1;
      }),
    );
    return moved.reduce<number>((sum, count) => sum + count, 0);
  });
}

export { migrateNextSteps, movedNextStep };
