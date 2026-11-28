"use client";

import {
  type JSX,
  type ReactNode,
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
import { romanNumeral } from "@/ui/roman-numeral.ts";
import { entryHolds, plainText } from "@/zotero/works-cited.ts";
import type { WorksCitedEntry, ZoteroReferenceId } from "@/zotero/zotero.ts";
import { markZoteroReferenceAction } from "@/zotero/zotero-actions.ts";
import type { ZoteroReference } from "@/zotero/zotero-list-store.ts";
import { ReferenceNotes } from "./zotero-notes.tsx";

const COPY: typeof ZOTERO_COPY.list = ZOTERO_COPY.list;

// A Works Cited entry as MLA sets it: its titles in italics, wrapping
// anywhere a long address needs to, and anything that follows its last
// word, such as the numerals of its notes.
function WorksCitedText({
  entry,
  children,
}: {
  readonly entry: WorksCitedEntry;
  readonly children?: ReactNode;
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
      {children}
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

// The rubric numeral of each reference's notes, counted down the list in
// view: the first reference's notes are i and ii, the next one's iii.
function noteNumerals(
  references: readonly ZoteroReference[],
): ReadonlyMap<ZoteroReferenceId, readonly string[]> {
  const numerals = new Map<ZoteroReferenceId, readonly string[]>();
  let count = 0;
  for (const reference of references) {
    const first = count + 1;
    numerals.set(
      reference.id,
      reference.notes.map((_note, index) => romanNumeral(first + index)),
    );
    count += reference.notes.length;
  }
  return numerals;
}

// One reference: its checkmark, when the list shows them, its entry keyed
// to its notes, a link to the item in Zotero, and its notes beside it.
function ReferenceRow({
  questId,
  listId,
  reference,
  checkmarks,
  numerals,
  notesOpen,
  onMark,
}: {
  readonly questId: QuestId;
  readonly listId: ListId;
  readonly reference: ZoteroReference;
  readonly checkmarks: "markable" | "shown" | "hidden";
  readonly numerals: readonly string[];
  readonly notesOpen: boolean;
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
        <WorksCitedText entry={reference.entry}>
          {numerals.length > 0 && (
            <sup className="zotero-note-ref" aria-hidden="true">
              {numerals.join(" ")}
            </sup>
          )}
        </WorksCitedText>
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
      <ReferenceNotes
        place={{ questId, listId, referenceId: reference.id }}
        entry={text}
        notes={reference.notes}
        numerals={numerals}
        open={notesOpen}
      />
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
  notesOpen,
  search,
}: {
  readonly questId: QuestId;
  readonly listId: ListId;
  readonly label: string;
  readonly references: readonly ZoteroReference[];
  readonly checkmarks: "markable" | "shown" | "hidden";
  // Whether people may add and edit notes: while the list's collection is
  // available.
  readonly notesOpen: boolean;
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
  const numerals = noteNumerals(inView);
  return (
    <>
      {inView.length > 0 && (
        <div className="zotero-works">
          <div className="zotero-works-heads" aria-hidden="true">
            <span className="zotero-works-head">{ZOTERO_COPY.notes.works}</span>
            <span className="zotero-works-head">
              {ZOTERO_COPY.notes.heading}
            </span>
          </div>
          <ul aria-label={label} className="zotero-references">
            {inView.map((reference) => (
              <ReferenceRow
                key={reference.id}
                questId={questId}
                listId={listId}
                reference={reference}
                checkmarks={checkmarks}
                numerals={numerals.get(reference.id) ?? []}
                notesOpen={notesOpen}
                onMark={mark}
              />
            ))}
          </ul>
        </div>
      )}
      {inView.length === 0 && search.trim() !== "" && (
        <p className="list-page-empty">{COPY.noMatch(search.trim())}</p>
      )}
      {problem !== undefined && <Alert>{problem}</Alert>}
    </>
  );
}

export { WorksCitedText, ZoteroReferences };
