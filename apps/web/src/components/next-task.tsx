"use client";

import { type JSX, useCallback, useId } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { useQuestAction } from "@/components/use-quest-action.ts";
import type { QuestId } from "@/ids.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import type { OpenTask } from "@/lists/list-item-store.ts";
import type { List } from "@/lists/list-store.ts";
import { LISTS_COPY } from "@/ui/copy/lists.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";

function numbered({ taskNumber, text }: OpenTask): string {
  if (taskNumber === null) {
    return text;
  }
  return `#${taskNumber} ${text}`;
}

// The quest's next task, which the user can check off in place, and the
// open tasks that follow it.
function NextTask({
  questId,
  tasks,
  lists,
}: {
  readonly questId: QuestId;
  // The quest's next tasks, in order; the first is the next task.
  readonly tasks: readonly OpenTask[];
  readonly lists: readonly List[];
}): JSX.Element {
  const headingId = useId();
  const [task, ...then] = tasks;
  const { run, busy, status, problem } = useQuestAction(changeListItemAction);
  const checkOff = useCallback(async (): Promise<void> => {
    if (task !== undefined) {
      await run({
        questId,
        listId: task.listId,
        change: { kind: "check", id: task.id, checkedOff: true },
      });
    }
  }, [questId, run, task]);
  const list = lists.find(({ id }) => id === task?.listId);
  return (
    <section
      aria-labelledby={headingId}
      className="quest-overview-hero quest-next-task"
    >
      <h3 id={headingId} className="quest-overview-label">
        {QUEST_SIDEBAR_COPY.nextTask}
      </h3>
      {task !== undefined && (
        <>
          <p className="quest-next-task-text">
            {task.taskNumber !== null && (
              <span className="font-mono text-muted text-xs">
                {LISTS_COPY.taskNumber(task.taskNumber)}{" "}
              </span>
            )}
            {task.text}
          </p>
          <Button
            className="quest-next-task-check"
            disabled={busy}
            onClick={checkOff}
          >
            {list?.checkOff ?? QUEST_OVERVIEW_COPY.checkOff}
          </Button>
          {then.length > 0 && (
            <p className="wrap-anywhere text-muted text-sm">
              {QUEST_OVERVIEW_COPY.followedBy(then.map(numbered))}
            </p>
          )}
        </>
      )}
      {task === undefined && (
        <p className="text-muted">{QUEST_SIDEBAR_COPY.noNextTask}</p>
      )}
      {problem !== undefined && <Alert>{problem}</Alert>}
      <FormStatus>{status}</FormStatus>
    </section>
  );
}

export { NextTask };
