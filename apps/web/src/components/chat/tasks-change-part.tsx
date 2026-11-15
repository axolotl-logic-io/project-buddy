"use client";

import { type JSX, useCallback } from "react";
import type { ToolCallPart } from "@/components/chat/tool-parts.tsx";
import { useTasks } from "@/components/tasks/use-tasks.ts";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { CHANGE_TASKS_OUTPUT } from "@/replies/tools/change-tasks-contract.ts";
import type { TasksChangeLine } from "@/tasks/tasks.ts";
import { readTasksPart } from "@/tasks/tasks-message.ts";
import { TASKS_CHANGE_COPY, tasksLineText } from "@/ui/copy/tasks.ts";

type LineIcon = "plus" | "pencil" | "check" | "close" | "arrow-down" | "trash";

const LINE_ICONS: Readonly<Record<TasksChangeLine["kind"], LineIcon>> = {
  add: "plus",
  change: "pencil",
  complete: "check",
  reopen: "close",
  move: "arrow-down",
  remove: "trash",
};

// Each line with its words and a key: its words, and how often they came
// before, since two lines of one change may read the same.
function keyedLines(
  lines: readonly TasksChangeLine[],
): { key: string; line: TasksChangeLine; text: string }[] {
  const seen = new Map<string, number>();
  return lines.map((line) => {
    const text = tasksLineText(line);
    const count = (seen.get(text) ?? 0) + 1;
    seen.set(text, count);
    return { key: `${text}#${count}`, line, text };
  });
}

// One saved tasks change, as a notice set apart from the words around it:
// what each operation did, and Undo while the change can still be undone.
// An undo can't be undone.
function TasksChangeCard({
  version,
  lines,
  byPerson,
  undoesVersion,
}: {
  readonly version: number;
  readonly lines: readonly TasksChangeLine[];
  readonly byPerson: boolean;
  readonly undoesVersion?: number | undefined;
}): JSX.Element {
  const tasks = useTasks();
  const undo = tasks?.undo;
  const undoChange = useCallback((): Promise<void> => {
    if (undo === undefined) {
      return Promise.resolve();
    }
    return undo(version);
  }, [undo, version]);
  const undone = tasks?.state.undone.includes(version) === true;
  let title: string = TASKS_CHANGE_COPY.label;
  if (undoesVersion !== undefined) {
    title = TASKS_CHANGE_COPY.undid;
  }
  return (
    <aside aria-label={TASKS_CHANGE_COPY.label} className="tasks-change">
      <p className="tasks-change-heading">
        <span className="icon-line font-medium">
          <Icon name="checklist" />
          {title}
        </span>
        {undone && (
          <span className="text-muted">{TASKS_CHANGE_COPY.undone}</span>
        )}
        {!undone && undoesVersion === undefined && tasks !== undefined && (
          <Button
            variant="quiet"
            onClick={undoChange}
            disabled={tasks.pending || tasks.disabledNote !== undefined}
            aria-label={TASKS_CHANGE_COPY.undoLabel}
          >
            {TASKS_CHANGE_COPY.undo}
          </Button>
        )}
      </p>
      <ul className="tasks-change-lines">
        {keyedLines(lines).map(({ key, line, text }) => (
          <li key={key} className="icon-line">
            <Icon name={LINE_ICONS[line.kind]} />
            <span>{text}</span>
          </li>
        ))}
      </ul>
      {byPerson === true && (
        <p className="text-muted text-xs">{TASKS_CHANGE_COPY.noModel}</p>
      )}
    </aside>
  );
}

// A change_tasks call of the construct's: the change it saved, or a quiet
// line when it saved none. Nothing shows until the call answers.
function TasksChangeToolPart({
  part,
}: {
  readonly part: Pick<ToolCallPart, "result">;
}): JSX.Element | null {
  const output = CHANGE_TASKS_OUTPUT.safeParse(part.result);
  if (!output.success) {
    return null;
  }
  const change = output.data;
  if (change.status === "not-changed") {
    return <p className="text-muted text-sm">{TASKS_CHANGE_COPY.notChanged}</p>;
  }
  return (
    <TasksChangeCard
      version={change.version}
      lines={change.lines}
      byPerson={false}
    />
  );
}

// A tasks message's part (src/tasks/tasks-message.ts): a person's tasks change,
// with the command they typed for it, or a Tasks card, inside the frame of
// their message. Any other data part shows nothing.
function TasksDataPart({
  name,
  data,
}: {
  readonly name: string;
  readonly data: unknown;
}): JSX.Element | null {
  const part = readTasksPart({ type: `data-${name}`, data });
  if (part === undefined) {
    return null;
  }
  if (part.kind === "card") {
    return (
      <div className="tasks-message">
        <p className="tasks-command">{part.data.command}</p>
        <p className="text-muted text-sm">{TASKS_CHANGE_COPY.sideMenu}</p>
      </div>
    );
  }
  const { command, version, lines, undoesVersion } = part.data;
  return (
    <div className="tasks-message">
      {command !== undefined && <p className="tasks-command">{command}</p>}
      <TasksChangeCard
        version={version}
        lines={lines}
        byPerson={true}
        undoesVersion={undoesVersion}
      />
    </div>
  );
}

export { TasksChangeToolPart, TasksDataPart };
