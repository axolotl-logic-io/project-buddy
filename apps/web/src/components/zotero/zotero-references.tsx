"use client";

import {
  type JSX,
  startTransition,
  useCallback,
  useOptimistic,
  useState,
} from "react";
import { Alert } from "@/components/ui/form-message.tsx";
import { TaskCheck } from "@/components/ui/task-check.tsx";
import type { QuestId } from "@/ids.ts";
import type { ListId } from "@/lists/list.ts";
import { ZOTERO_COPY } from "@/ui/copy/zotero.ts";
import { entryHolds, plainText } from "@/zotero/works-cited.ts";
import type { WorksCitedEntry, ZoteroReferenceId } from "@/zotero/zotero.ts";
import { markZoteroReferenceAction } from "@/zotero/zotero-actions.ts";
import type { ZoteroReference } from "@/zotero/zotero-list-store.ts";

const COPY: typeof ZOTERO_COPY.list = ZOTERO_COPY.list;

// A Works Cited entry as MLA sets it: its titles in italics, wrapping
// anywhere a long address needs to.
function WorksCitedText({
  entry,
}: {
  readonly entry: WorksCitedEntry;
}): JSX.Element {
  return (
    <span className="zotero-entry">
      {entry.map((run, index) => {
        const key = `${index}-${run.text}`;
        if (run.italic) {
          return <i key={key}>{run.text}</i>;
        }
        return <span key={key}>{run.text}</span>;
      })}
    </span>
  );
}

interface Mark {
  readonly id: ZoteroReferenceId;
  readonly checked: boolean;
}

// The reference's checkmark as the page shows it: a change waiting for the
// next sync, else the checkmark Zotero had at the last sync.
function shownCheck(reference: ZoteroReference): boolean {
  return reference.pending ?? reference.checked ?? false;
}

function withMark(
  references: readonly ZoteroReference[],
  mark: Mark,
): readonly ZoteroReference[] {
  return references.map((reference) => {
    if (reference.id !== mark.id) {
      return reference;
    }
    let pending: boolean | undefined = mark.checked;
    if (mark.checked === reference.checked) {
      pending = undefined;
    }
    return { ...reference, pending };
  });
}

// One reference: its checkmark, when the list shows them, its entry, and a
// link to the item in Zotero.
function ReferenceRow({
  reference,
  checkmarks,
  onMark,
}: {
  readonly reference: ZoteroReference;
  readonly checkmarks: "markable" | "shown" | "hidden";
  readonly onMark: (mark: Mark) => void;
}): JSX.Element {
  const text = plainText(reference.entry);
  const checked = shownCheck(reference);
  const toggle = useCallback(
    (): void => onMark({ id: reference.id, checked: !checked }),
    [checked, onMark, reference.id],
  );
  let onChange: (() => void) | undefined;
  if (checkmarks === "markable") {
    onChange = toggle;
  }
  return (
    <li
      className="zotero-reference"
      data-pending={reference.pending !== undefined}
    >
      {checkmarks !== "hidden" && (
        <TaskCheck
          checked={checked}
          onChange={onChange}
          disabled={checkmarks !== "markable"}
          label={COPY.check(text)}
        />
      )}
      <div className="zotero-reference-body">
        <WorksCitedText entry={reference.entry} />
        <span className="zotero-reference-meta">
          {reference.pending !== undefined && (
            <span className="zotero-reference-waiting">{COPY.waiting}</span>
          )}
          {reference.href !== undefined && (
            <a
              className="zotero-reference-open"
              href={reference.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={COPY.openInZoteroFor(text)}
            >
              {COPY.openInZotero}
            </a>
          )}
        </span>
      </div>
    </li>
  );
}

// A Zotero Collection list's references in Works Cited order, filtered by
// the search. Everyone in the quest may mark them when markable; each mark
// waits for the owner's next sync.
function ZoteroReferences({
  questId,
  listId,
  label,
  references,
  checkmarks,
  search,
}: {
  readonly questId: QuestId;
  readonly listId: ListId;
  readonly label: string;
  readonly references: readonly ZoteroReference[];
  readonly checkmarks: "markable" | "shown" | "hidden";
  readonly search: string;
}): JSX.Element {
  const [shown, showMark] = useOptimistic(references, withMark);
  const [problem, setProblem] = useState<string | undefined>();
  const mark = useCallback(
    (change: Mark): void => {
      setProblem(undefined);
      startTransition(async () => {
        showMark(change);
        const result = await markZoteroReferenceAction(
          questId,
          listId,
          change.id,
          change.checked,
        );
        if (!result.ok) {
          setProblem(result.message);
        }
      });
    },
    [listId, questId, showMark],
  );
  let inView = shown;
  if (search.trim() !== "") {
    inView = shown.filter((reference) => entryHolds(reference.entry, search));
  }
  return (
    <>
      {inView.length > 0 && (
        <ul aria-label={label} className="zotero-references">
          {inView.map((reference) => (
            <ReferenceRow
              key={reference.id}
              reference={reference}
              checkmarks={checkmarks}
              onMark={mark}
            />
          ))}
        </ul>
      )}
      {inView.length === 0 && search.trim() !== "" && (
        <p className="list-page-empty">{COPY.noMatch(search.trim())}</p>
      )}
      {problem !== undefined && <Alert>{problem}</Alert>}
    </>
  );
}

export { WorksCitedText, ZoteroReferences };
