"use client";

import { type JSX, useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button.tsx";
import { FormStatus } from "@/components/ui/form-message.tsx";
import type { ProjectId } from "@/ids.ts";
import { contentText } from "@/journal/content-text.ts";
import {
  GOAL_MAX_LENGTH,
  PREFERENCE_MAX_LENGTH,
  type SectionEdit,
  type SectionKind,
} from "@/journal/journal.ts";
import { changeSectionAction } from "@/journal/journal-actions.ts";
import type { SectionState } from "@/journal/journal-store.ts";
import { JOURNAL_SECTIONS_COPY as COPY } from "@/ui/copy/journal.ts";

function UndoSection({
  projectId,
  kind,
  version,
}: {
  readonly projectId: ProjectId;
  readonly kind: SectionKind;
  readonly version: number;
}): JSX.Element {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState("");
  const undo = useCallback((): void => {
    start(async (): Promise<void> => {
      const result = await changeSectionAction({
        projectId,
        kind,
        undo: version,
      });
      if (result.status === "changed") {
        setStatus(COPY.undone);
      } else if (result.reason === "outdated") {
        setStatus(COPY.conflict);
      } else {
        setStatus(COPY.failed);
      }
    });
  }, [projectId, kind, version]);
  return (
    <div>
      <Button
        variant="quiet"
        onClick={undo}
        disabled={pending || status === COPY.undone}
      >
        {COPY.undo}
      </Button>
      <FormStatus>{status}</FormStatus>
    </div>
  );
}

function SectionEditor({
  projectId,
  initial,
}: {
  readonly projectId: ProjectId;
  readonly initial: SectionState;
}): JSX.Element {
  const [state, setState] = useState(initial);
  const [status, setStatus] = useState("");
  const [pending, start] = useTransition();
  if (initial.version > state.version) {
    setState(initial);
  }
  const { content } = state;
  const submit = useCallback(
    (data: FormData): void => {
      const text = String(data.get("text") ?? "");
      const op = String(data.get("op") ?? "");
      const number = Number(data.get("number"));
      const beforeValue = Number(data.get("before"));
      let before: number | undefined;
      if (beforeValue > 0) {
        before = beforeValue;
      }
      let edit: SectionEdit = { kind: "goal", text };
      if (content.kind === "preferences") {
        if (op === "add") {
          edit = { kind: "preferences", operations: [{ op, text }] };
        } else if (op === "change") {
          edit = {
            kind: "preferences",
            operations: [{ op, preference: number, text }],
          };
        } else if (op === "move") {
          edit = {
            kind: "preferences",
            operations: [{ op, preference: number, before }],
          };
        } else if (op === "remove") {
          edit = {
            kind: "preferences",
            operations: [{ op, preference: number }],
          };
        } else {
          setStatus(COPY.failed);
          return;
        }
      }
      start(async (): Promise<void> => {
        const result = await changeSectionAction({
          projectId,
          kind: content.kind,
          basedOn: state.version,
          edit,
        });
        if (result.state !== undefined) {
          setState(result.state);
        }
        if (result.status === "changed") {
          setStatus(COPY.changed);
        } else if (result.reason === "outdated") {
          setStatus(COPY.conflict);
        } else if (result.reason === "unchanged") {
          setStatus(COPY.unchanged);
        } else {
          setStatus(COPY.failed);
        }
      });
    },
    [content.kind, state.version, projectId],
  );
  return (
    <section className="page-slot">
      <h2 className="section-heading">{COPY[content.kind]}</h2>
      {content.kind === "goal" && (
        <>
          <p className="whitespace-pre-wrap">{contentText(content)}</p>
          <details>
            <summary>{COPY.editGoal}</summary>
            <p className="text-muted">{COPY.goalIntro}</p>
            <form action={submit} className="flex flex-col gap-2">
              <label>
                {COPY.goalText}
                <textarea
                  name="text"
                  defaultValue={content.text}
                  maxLength={GOAL_MAX_LENGTH}
                  disabled={pending}
                />
              </label>
              <Button type="submit" disabled={pending}>
                {COPY.save}
              </Button>
            </form>
          </details>
        </>
      )}
      {content.kind === "preferences" && (
        <>
          <p className="whitespace-pre-wrap">{contentText(content)}</p>
          <details>
            <summary>{COPY.editPreferences}</summary>
            <p className="text-muted">{COPY.preferencesIntro}</p>
            {content.items.length === 0 && <p>{COPY.emptyPreferences}</p>}
            <ol className="flex flex-col gap-2">
              {content.items.map((item, index) => (
                <li key={item.number} className="flex flex-col gap-2">
                  <form action={submit} className="flex flex-wrap gap-2">
                    <input type="hidden" name="number" value={item.number} />
                    <label>
                      {COPY.preferenceNumber(item.number)}
                      <input
                        name="text"
                        defaultValue={item.text}
                        maxLength={PREFERENCE_MAX_LENGTH}
                        required={true}
                        disabled={pending}
                      />
                    </label>
                    <Button
                      type="submit"
                      name="op"
                      value="change"
                      disabled={pending}
                    >
                      {COPY.edit}
                    </Button>
                    <Button
                      type="submit"
                      name="op"
                      value="remove"
                      disabled={pending}
                    >
                      {COPY.remove}
                    </Button>
                  </form>
                  <div className="flex gap-2">
                    {index > 0 && (
                      <form action={submit}>
                        <input
                          type="hidden"
                          name="number"
                          value={item.number}
                        />
                        <input
                          type="hidden"
                          name="before"
                          value={content.items[index - 1]?.number}
                        />
                        <Button
                          type="submit"
                          name="op"
                          value="move"
                          disabled={pending}
                        >
                          {COPY.up}
                        </Button>
                      </form>
                    )}
                    {index < content.items.length - 1 && (
                      <form action={submit}>
                        <input
                          type="hidden"
                          name="number"
                          value={item.number}
                        />
                        <input
                          type="hidden"
                          name="before"
                          value={content.items[index + 2]?.number ?? ""}
                        />
                        <Button
                          type="submit"
                          name="op"
                          value="move"
                          disabled={pending}
                        >
                          {COPY.down}
                        </Button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            <form action={submit} className="flex flex-wrap gap-2">
              <label>
                {COPY.text}
                <input
                  name="text"
                  required={true}
                  maxLength={PREFERENCE_MAX_LENGTH}
                  disabled={pending}
                />
              </label>
              <Button type="submit" name="op" value="add" disabled={pending}>
                {COPY.add}
              </Button>
            </form>
            <p className="text-muted">{COPY.commandHelp}</p>
          </details>
        </>
      )}
      <FormStatus>{status}</FormStatus>
      <details>
        <summary>{COPY.history}</summary>
        <ol>
          {state.history.map((version) => (
            <li key={version.version}>
              <p>{COPY.versionAuthor(version.version, version.author)}</p>
              <p className="whitespace-pre-wrap">
                {contentText(version.content)}
              </p>
              {version.undoesVersion === null &&
                !state.history.some(
                  (entry) => entry.undoesVersion === version.version,
                ) && (
                  <UndoSection
                    projectId={projectId}
                    kind={content.kind}
                    version={version.version}
                  />
                )}
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}

export { SectionEditor, UndoSection };
