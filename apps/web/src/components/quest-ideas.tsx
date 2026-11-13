"use client";

import { type JSX, useCallback, useRef, useState } from "react";
import {
  AddListItem,
  EditableList,
  EditableListAction,
  EditableListRow,
} from "@/components/ui/editable-list.tsx";
import type { EditorOptions } from "@/components/ui/editable-list-contract.ts";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import {
  IDEA_REQUEST,
  IDEA_TEXT_MAX_LENGTH,
  type Idea,
  type IdeaAction,
  type IdeaRequest,
} from "@/ideas/idea.ts";
import type { QuestId } from "@/ids.ts";
import { IDEAS_COPY } from "@/ui/copy/ideas.ts";

function checkIdeaText(text: string): { text: string } | { problem: string } {
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > IDEA_TEXT_MAX_LENGTH) {
    return { problem: IDEAS_COPY.invalid };
  }
  return { text: trimmed };
}
const IDEA_EDITOR: EditorOptions = {
  label: IDEAS_COPY.label,
  save: IDEAS_COPY.save,
  cancel: IDEAS_COPY.cancel,
  placeholder: IDEAS_COPY.add,
  maxLength: IDEA_TEXT_MAX_LENGTH,
  validate: checkIdeaText,
};
const ADD_EDITOR: EditorOptions = { ...IDEA_EDITOR, save: IDEAS_COPY.add };

function IdeaRow({
  questId,
  idea,
  busy,
  run,
}: {
  readonly questId: QuestId;
  readonly idea: Idea;
  readonly busy: boolean;
  readonly run: (request: IdeaRequest) => Promise<boolean>;
}): JSX.Element {
  const save = useCallback(
    (text: string): Promise<boolean> =>
      run({ op: "edit", questId, id: idea.id, text }),
    [questId, idea.id, run],
  );
  const move = useCallback(async (): Promise<void> => {
    await run({ op: "move", questId, id: idea.id });
  }, [questId, idea.id, run]);
  const remove = useCallback(async (): Promise<void> => {
    await run({ op: "remove", questId, id: idea.id });
  }, [questId, idea.id, run]);
  return (
    <EditableListRow
      id={idea.id}
      text={idea.text}
      editor={IDEA_EDITOR}
      editLabel={IDEAS_COPY.edit}
      actionsLabel={IDEAS_COPY.actions(idea.text)}
      disabled={busy}
      onSave={save}
    >
      <EditableListAction icon="checklist" onSelect={move}>
        {IDEAS_COPY.move}
      </EditableListAction>
      <EditableListAction icon="trash" onSelect={remove}>
        {IDEAS_COPY.remove}
      </EditableListAction>
    </EditableListRow>
  );
}

function QuestIdeas({
  questId,
  ideas: initialIdeas,
  action,
  embedded,
}: {
  readonly questId: QuestId;
  readonly ideas: readonly Idea[];
  readonly action: IdeaAction;
  readonly embedded?: boolean;
}): JSX.Element {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const run = useCallback(
    async (request: IdeaRequest): Promise<boolean> => {
      setBusy(true);
      setProblem(undefined);
      setStatus(undefined);
      try {
        const result = await action(request);
        if (result.kind === "problem") {
          setProblem(result.text);
          return false;
        }
        // Refresh supplies additions; apply edits/removals now so controls never
        // show an idea that the completed action has already removed.
        if (request.op === "edit") {
          setIdeas((current) =>
            current.map((idea) => {
              if (idea.id === request.id) {
                return { ...idea, text: request.text };
              }
              return idea;
            }),
          );
        } else if (request.op === "reorder") {
          setIdeas((current) => {
            const moved = current.find((idea) => idea.id === request.id);
            if (moved === undefined) {
              return current;
            }
            const rest = current.filter((idea) => idea.id !== request.id);
            const index = rest.findIndex((idea) => idea.id === request.before);
            if (index < 0) {
              return [...rest, moved];
            }
            return [...rest.slice(0, index), moved, ...rest.slice(index)];
          });
        } else if (request.op !== "add") {
          setIdeas((current) =>
            current.filter((idea) => idea.id !== request.id),
          );
          headingRef.current?.focus();
        }
        let feedback: string = IDEAS_COPY.saved;
        if (request.op === "remove") {
          feedback = IDEAS_COPY.removed;
        }
        if (request.op === "move") {
          feedback = IDEAS_COPY.moved;
        }
        if (request.op === "reorder") {
          feedback = IDEAS_COPY.reordered;
        }
        setStatus(feedback);
        return true;
      } catch {
        setProblem(IDEAS_COPY.failed);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [action],
  );
  const add = useCallback(
    (text: string): Promise<boolean> => run({ op: "add", questId, text }),
    [questId, run],
  );
  const reorder = useCallback(
    async (id: string, before: string | undefined): Promise<boolean> => {
      const parsed = IDEA_REQUEST.safeParse({
        op: "reorder",
        questId,
        id,
        before,
      });
      if (!parsed.success) {
        return false;
      }
      return await run(parsed.data);
    },
    [questId, run],
  );
  // A route refresh can add an idea or load another quest's list.
  const [previous, setPrevious] = useState(initialIdeas);
  if (previous !== initialIdeas) {
    setPrevious(initialIdeas);
    setIdeas(initialIdeas);
  }
  let Heading: "h2" | "p" = "h2";
  let headingClass = "section-heading";
  if (embedded === true) {
    Heading = "p";
    headingClass = "sr-only";
  }
  return (
    <section className="page-slot">
      <Heading ref={headingRef} tabIndex={-1} className={headingClass}>
        {IDEAS_COPY.heading}
      </Heading>
      {embedded !== true && <p className="text-muted">{IDEAS_COPY.intro}</p>}
      <FormStatus>{status}</FormStatus>
      {problem !== undefined && <Alert>{problem}</Alert>}
      {ideas.length === 0 && <p className="text-muted">{IDEAS_COPY.empty}</p>}
      <AddListItem
        label={IDEAS_COPY.add}
        editor={ADD_EDITOR}
        disabled={busy}
        onSave={add}
      />
      <EditableList label={IDEAS_COPY.heading} onMove={reorder}>
        {ideas.map((idea) => (
          <IdeaRow
            key={idea.id}
            questId={questId}
            idea={idea}
            busy={busy}
            run={run}
          />
        ))}
      </EditableList>
    </section>
  );
}

export { QuestIdeas };
