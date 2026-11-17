"use client";

import { type JSX, useCallback, useRef, useState } from "react";
import { PANEL_COMMAND, placeBefore } from "@/commands/panel-commands.ts";
import { usePanelSend } from "@/components/chat/chat-send.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  AddListItem,
  EditableList,
  EditableListAction,
  EditableListRow,
} from "@/components/ui/editable-list.tsx";
import type { EditorOptions } from "@/components/ui/editable-list-contract.ts";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { IDEA_TEXT_MAX_LENGTH, type Idea } from "@/ideas/idea.ts";
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

// What a row's control does to its idea.
type IdeaChange =
  | { readonly op: "edit"; readonly id: string; readonly text: string }
  | { readonly op: "move" | "remove"; readonly id: string };

function IdeaRow({
  idea,
  busy,
  run,
}: {
  readonly idea: Idea;
  readonly busy: boolean;
  readonly run: (change: IdeaChange) => Promise<boolean>;
}): JSX.Element {
  const save = useCallback(
    (text: string): Promise<boolean> => run({ op: "edit", id: idea.id, text }),
    [idea.id, run],
  );
  const move = useCallback(async (): Promise<void> => {
    await run({ op: "move", id: idea.id });
  }, [idea.id, run]);
  const remove = useCallback(async (): Promise<void> => {
    await run({ op: "remove", id: idea.id });
  }, [idea.id, run]);
  return (
    <EditableListRow
      id={idea.id}
      text={idea.text}
      editor={IDEA_EDITOR}
      editLabel={IDEAS_COPY.edit}
      actionsLabel={IDEAS_COPY.actions(idea.text)}
      disabled={busy}
      onSave={save}
      leading={<Icon name="sparkle" />}
      detail={
        <span className="idea-decision">
          <span>{IDEAS_COPY.possibility}</span>
          <Button variant="quiet" onClick={move} disabled={busy}>
            {IDEAS_COPY.move}
            <Icon name="checklist" />
          </Button>
        </span>
      }
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

// The command a row's control sends for its idea, at place, 1 being first.
function ideaCommand(change: IdeaChange, place: number): string {
  switch (change.op) {
    case "edit":
      return PANEL_COMMAND.editIdea(place, change.text);
    case "move":
      return PANEL_COMMAND.ideaToTasks(place);
    case "remove":
      return PANEL_COMMAND.dropIdea(place);
    default:
      return change satisfies never;
  }
}

// A quest's Ideas. Each control sends its command to the quest's
// conversation (src/commands/panel-commands.ts), which saves the change and
// notes it; the list follows the route refresh that comes with it.
function QuestIdeas({
  ideas: savedIdeas,
  embedded,
}: {
  readonly ideas: readonly Idea[];
  readonly embedded?: boolean;
}): JSX.Element {
  const { send, busy, status, problem } = usePanelSend();
  const [ideas, setIdeas] = useState(savedIdeas);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // A route refresh brings the saved list, as after a command.
  const [previous, setPrevious] = useState(savedIdeas);
  if (previous !== savedIdeas) {
    setPrevious(savedIdeas);
    setIdeas(savedIdeas);
  }
  const run = useCallback(
    async (change: IdeaChange): Promise<boolean> => {
      const index = ideas.findIndex((idea) => idea.id === change.id);
      if (index < 0) {
        return false;
      }
      const result = await send(ideaCommand(change, index + 1));
      if (result.sent && change.op !== "edit") {
        setIdeas((current) => current.filter((idea) => idea.id !== change.id));
        headingRef.current?.focus();
      }
      return result.sent;
    },
    [ideas, send],
  );
  const add = useCallback(
    async (text: string): Promise<boolean> =>
      (await send(PANEL_COMMAND.idea(text))).sent,
    [send],
  );
  const reorder = useCallback(
    async (id: string, before: string | undefined): Promise<boolean> => {
      const ids: readonly string[] = ideas.map((idea) => idea.id);
      const from = ids.indexOf(id);
      const to = placeBefore(ids, id, before);
      if (from < 0 || to === undefined) {
        return false;
      }
      return (await send(PANEL_COMMAND.moveIdea(from + 1, to))).sent;
    },
    [ideas, send],
  );
  let Heading: "h2" | "p" = "h2";
  let headingClass = "section-heading";
  if (embedded === true) {
    Heading = "p";
    headingClass = "sr-only";
  }
  return (
    <section className="page-slot bucket-desk bucket-ideas">
      <Heading ref={headingRef} tabIndex={-1} className={headingClass}>
        {IDEAS_COPY.heading}
      </Heading>
      {embedded !== true && <p className="text-muted">{IDEAS_COPY.intro}</p>}
      <FormStatus>{status}</FormStatus>
      {problem !== undefined && <Alert>{problem}</Alert>}
      <div className="bucket-toolbar">
        <p className="bucket-summary">{IDEAS_COPY.summary(ideas.length)}</p>
        <AddListItem
          label={IDEAS_COPY.add}
          editor={ADD_EDITOR}
          disabled={busy}
          onSave={add}
        />
      </div>
      {ideas.length === 0 && <p className="bucket-empty">{IDEAS_COPY.empty}</p>}
      <EditableList label={IDEAS_COPY.heading} onMove={reorder}>
        {ideas.map((idea) => (
          <IdeaRow key={idea.id} idea={idea} busy={busy} run={run} />
        ))}
      </EditableList>
    </section>
  );
}

export { QuestIdeas };
