"use client";

import Link from "next/link";
import {
  type JSX,
  startTransition,
  useCallback,
  useId,
  useOptimistic,
  useState,
} from "react";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { TaskCheck } from "@/components/ui/task-check.tsx";
import { useQuestAction } from "@/components/use-quest-action.ts";
import type { ListItemId } from "@/lists/list-item.ts";
import { changeListItemAction } from "@/lists/list-item-actions.ts";
import type { LifeSummary, SuggestedTask } from "@/quests/quest-index-store.ts";
import { CADENCE_COPY } from "@/ui/copy/cadence.ts";
import { LIFE_COPY } from "@/ui/copy/quests.ts";

const LIFE_FRAME_CORNERS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

function markDone(
  done: ReadonlySet<ListItemId>,
  id: ListItemId,
): ReadonlySet<ListItemId> {
  return new Set(done).add(id);
}

// The suggested task, checked off where it is offered.
function Suggestion({
  task,
  done,
  onCheck,
}: {
  readonly task: SuggestedTask;
  readonly done: boolean;
  readonly onCheck: (task: SuggestedTask) => void;
}): JSX.Element {
  const check = useCallback((): void => onCheck(task), [onCheck, task]);
  const checkId = useId();
  let className = "life-pin-suggestion";
  if (done) {
    className = "life-pin-suggestion life-pin-suggestion-done";
  }
  let detail = CADENCE_COPY.repeats(task.cadence);
  if (task.streak > 0) {
    detail = `${detail} · ${CADENCE_COPY.streak(task.cadence, task.streak)}`;
  }
  return (
    <div className={className}>
      <span className="quests-label">{LIFE_COPY.suggested}</span>
      <label className="life-pin-check" htmlFor={checkId}>
        <TaskCheck
          checked={done}
          disabled={done}
          id={checkId}
          onChange={check}
        />
        <span className="life-pin-task">{task.text}</span>
      </label>
      <span className="life-pin-recurring">
        <Icon name="repeat" />
        {detail}
      </span>
    </div>
  );
}

// The user's Life, pinned above their other quests: how many of its
// recurring tasks are done today, and one not done yet, picked at random,
// to check off here. The suggestion holds while it waits, however the
// page refreshes; once checked off, another takes its place.
function LifePin({ life }: { readonly life: LifeSummary }): JSX.Element {
  const [heldId, setHeldId] = useState(life.suggestion?.id);
  let suggestion = life.waiting.find(({ id }) => id === heldId);
  const picked = life.suggestion;
  if (suggestion === undefined && picked !== undefined) {
    suggestion = picked;
    if (heldId !== picked.id) {
      setHeldId(picked.id);
    }
  }
  const [checked, showChecked] = useOptimistic(new Set<ListItemId>(), markDone);
  const { run, status, problem } = useQuestAction(changeListItemAction);
  const onCheck = useCallback(
    (task: SuggestedTask): void => {
      startTransition(async () => {
        showChecked(task.id);
        await run({
          questId: life.quest.id,
          listId: task.listId,
          change: { kind: "check", id: task.id, checkedOff: true },
        });
      });
    },
    [life.quest.id, run, showChecked],
  );
  let { doneNow } = life;
  if (suggestion !== undefined && checked.has(suggestion.id)) {
    doneNow += 1;
  }
  const href = `/quests/${life.quest.id}`;
  const nameId = useId();
  return (
    <section aria-labelledby={nameId} className="life-pin">
      {LIFE_FRAME_CORNERS.map((corner) => (
        <svg
          aria-hidden="true"
          className="life-pin-corner"
          data-corner={corner}
          height="26"
          key={corner}
          viewBox="0 0 26 26"
          width="26"
        >
          <path d="M0 26V9h4V4h5V0h17v2H11v5H7v4H2v15z" fill="currentColor" />
          <path
            d="M6.5 23V13H13V6.5H23"
            fill="none"
            opacity=".7"
            stroke="currentColor"
          />
          <path
            d="M10.5 6.5l4 4-4 4-4-4zM10.5 9 9 10.5l1.5 1.5 1.5-1.5z"
            fill="currentColor"
            fillRule="evenodd"
          />
        </svg>
      ))}
      <div className="life-pin-head">
        <span aria-hidden="true" className="quest-seal">
          <Icon name="sun" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="quest-finder-name" id={nameId}>
            {life.quest.name}
          </h2>
          <p className="quest-finder-meta">
            {LIFE_COPY.progress(doneNow, life.recurring)}
          </p>
        </div>
        <Button asChild={true} variant="secondary">
          <Link aria-label={LIFE_COPY.openLabel(life.quest.name)} href={href}>
            {LIFE_COPY.open}
          </Link>
        </Button>
      </div>
      {suggestion !== undefined && (
        <Suggestion
          done={checked.has(suggestion.id)}
          onCheck={onCheck}
          task={suggestion}
        />
      )}
      {problem !== undefined && <Alert>{problem}</Alert>}
      <FormStatus>{status}</FormStatus>
    </section>
  );
}

export { LifePin };
