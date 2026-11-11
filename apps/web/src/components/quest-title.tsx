"use client";

import {
  type ChangeEvent,
  type JSX,
  type KeyboardEvent,
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { ProjectId } from "@/ids.ts";
import { PROJECT_NAME_MAX_LENGTH } from "@/projects/project-name.ts";
import {
  type RenameProjectState,
  renameProjectAction,
} from "@/projects/rename-project-action.ts";
import type { Project } from "@/projects/store.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";

const IDLE: RenameProjectState = { kind: "idle" };

function TitleEditor({
  projectId,
  name,
  onClose,
}: {
  readonly projectId: ProjectId;
  readonly name: string;
  readonly onClose: (name?: string) => void;
}): JSX.Element {
  const errorId = useId();
  const [draft, setDraft] = useState(name);
  const updateDraft = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setDraft(event.target.value);
    },
    [],
  );
  const save = useCallback(
    async (
      previous: RenameProjectState,
      form: FormData,
    ): Promise<RenameProjectState> => {
      const result = await renameProjectAction(previous, form);
      if (result.kind === "saved") {
        onClose(result.name);
      }
      return result;
    },
    [onClose],
  );
  const [state, action, pending] = useActionState(save, IDLE);
  const focus = useCallback((input: HTMLInputElement | null): void => {
    input?.focus();
    input?.select();
  }, []);
  const cancel = useCallback((): void => onClose(), [onClose]);
  const cancelOnEscape = useCallback(
    (event: KeyboardEvent<HTMLElement>): void => {
      if (event.key === "Escape" && !pending) {
        event.preventDefault();
        onClose();
      }
    },
    [onClose, pending],
  );
  return (
    <form
      action={action}
      className="flex min-w-0 flex-col gap-2"
      noValidate={true}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input
        className="input-field quest-title-input"
        name="name"
        value={draft}
        onChange={updateDraft}
        maxLength={PROJECT_NAME_MAX_LENGTH}
        aria-label={PROJECT_COPY.titleLabel}
        aria-describedby={errorId}
        aria-invalid={state.kind === "invalid"}
        onKeyDown={cancelOnEscape}
        readOnly={pending}
        ref={focus}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} onKeyDown={cancelOnEscape}>
          {PROJECT_COPY.saveTitle}
        </Button>
        <Button
          variant="quiet"
          disabled={pending}
          onClick={cancel}
          onKeyDown={cancelOnEscape}
        >
          {PROJECT_COPY.cancelTitle}
        </Button>
      </div>
      {state.kind === "invalid" && <Alert id={errorId}>{state.message}</Alert>}
    </form>
  );
}

function QuestTitle({
  project,
}: {
  readonly project: Pick<Project, "id" | "name">;
}): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<string | undefined>(undefined);
  const pencilRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);
  useEffect(() => {
    if (editing === false && restoreFocusRef.current === true) {
      pencilRef.current?.focus();
      restoreFocusRef.current = false;
    }
  }, [editing]);
  const open = useCallback((): void => {
    setSaved(undefined);
    setEditing(true);
  }, []);
  const close = useCallback((name?: string): void => {
    setSaved(name);
    restoreFocusRef.current = true;
    setEditing(false);
  }, []);
  let title = project.name;
  if (saved !== undefined) {
    title = saved;
  }
  return (
    <div className="min-w-0 flex-1">
      {editing === true && (
        <TitleEditor projectId={project.id} name={title} onClose={close} />
      )}
      {editing === false && (
        <div className="flex min-w-0 items-start gap-2">
          <h1 className="page-heading">{title}</h1>
          <Button
            ref={pencilRef}
            variant="quiet"
            className="quest-title-edit"
            aria-label={PROJECT_COPY.rename}
            aria-expanded={false}
            onClick={open}
          >
            <Icon name="pencil" />
          </Button>
        </div>
      )}
      <FormStatus>{saved !== undefined && PROJECT_COPY.titleSaved}</FormStatus>
    </div>
  );
}

export { QuestTitle };
