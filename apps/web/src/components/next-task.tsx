"use client";

import { type JSX, useCallback, useRef } from "react";
import { useTasks } from "@/components/tasks/use-tasks.ts";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { openTasks } from "@/tasks/tasks.ts";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";
import { QUEST_SIDEBAR_COPY } from "@/ui/copy/quest-sidebar.ts";
import { TASKS_COPY } from "@/ui/copy/tasks.ts";

function NextTask(): JSX.Element {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const tasks = useTasks();
  const task = tasks && openTasks(tasks.state.tasks)[0];
  const complete = useCallback(async (): Promise<void> => {
    if (
      task !== undefined &&
      (await tasks?.change([{ op: "complete", task: task.number }])) === true
    ) {
      headingRef.current?.focus();
    }
  }, [task, tasks]);
  const undo = useCallback(async (): Promise<void> => {
    const version = tasks?.feedback?.undoVersion;
    if (version !== undefined) {
      await tasks?.undo(version);
      headingRef.current?.focus();
    }
  }, [tasks]);
  return (
    <div className="quest-overview-feature">
      <h3 ref={headingRef} tabIndex={-1} className="quest-overview-label">
        {QUEST_SIDEBAR_COPY.nextTask}
      </h3>
      {task !== undefined && (
        <div className="quest-next-task-row">
          <p className="wrap-anywhere font-heading font-semibold text-lg">
            <span className="font-mono text-muted text-xs">
              {TASKS_COPY.taskNumber(task.number)}{" "}
            </span>
            {task.text}
          </p>
          <Button
            onClick={complete}
            disabled={tasks?.pending}
            aria-label={TASKS_COPY.checkOff(task.text)}
          >
            <Icon name="check" />
            {QUEST_OVERVIEW_COPY.check}
          </Button>
        </div>
      )}
      {task === undefined && (
        <p className="text-muted">{QUEST_SIDEBAR_COPY.noNextTask}</p>
      )}
      {tasks?.feedback?.failed === true && <Alert>{tasks.feedback.text}</Alert>}
      <FormStatus>
        {tasks?.feedback?.failed !== true && tasks?.feedback?.text}
      </FormStatus>
      {tasks?.feedback?.undoVersion !== undefined && (
        <Button variant="quiet" onClick={undo} disabled={tasks.pending}>
          {TASKS_COPY.undo}
        </Button>
      )}
    </div>
  );
}

export { NextTask };
