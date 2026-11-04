"use client";

import {
  type ChangeEvent,
  type JSX,
  type SubmitEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import { keepLocalDraft, readLocalDraft } from "@/components/local-draft.ts";
import { Button } from "@/components/ui/button.tsx";
import { TextAreaField, TextField } from "@/components/ui/field.tsx";
import { FormStatus } from "@/components/ui/form-message.tsx";
import type { PromptKind } from "@/prompts/prompt.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";

// The text Reset puts back to its default.
const RESET_TEXT = "prompt";

// A prompt's name and texts as the editor holds them, by each text's field
// name.
interface PromptDraft {
  readonly name: string;
  readonly texts: Readonly<Record<string, string>>;
}

// An unsaved draft as this browser keeps it (local-draft.ts), with the save
// it was based on.
const KEPT_DRAFT = z.object({
  basedOn: z.string(),
  name: z.string(),
  texts: z.record(z.string(), z.string()),
});

// One of the prompt's texts, such as a buddy's prompt or an activity's
// opening request: its field's name, label and help, its saved text, and
// its limit, if it has one.
interface PromptEditorText {
  readonly name: string;
  readonly label: string;
  readonly help: string;
  readonly text: string;
  readonly maxLength?: number;
}

// What the editor last did that the user should know.
type Notice = "none" | "reset" | "restored";

function sameDraft(one: PromptDraft, other: PromptDraft): boolean {
  return (
    one.name === other.name &&
    Object.entries(one.texts).every(
      ([field, text]) => other.texts[field] === text,
    )
  );
}

// The kept draft's texts, for the fields the prompt has; a field the draft
// doesn't have keeps its saved text.
function restoredDraft(
  kept: z.infer<typeof KEPT_DRAFT>,
  saved: PromptDraft,
): PromptDraft {
  const texts = Object.fromEntries(
    Object.entries(saved.texts).map(([field, text]) => {
      const { [field]: keptText = text } = kept.texts;
      return [field, keptText];
    }),
  );
  return { name: kept.name, texts };
}

// What the status line says after each.
const NOTICE_TEXTS: Readonly<Record<Notice, string>> = {
  none: "",
  reset: PROMPT_COPY.resetDone,
  restored: PROMPT_COPY.restored,
};

// The editor of one of the user's own buddies, activities or spells: its
// name, then its texts under the Prompt heading, with Save. Nothing changes
// the saved prompt but Save.
// - Save refuses a name that is empty or only spaces, saying so beside the
//   name, which gets focus; what she typed stays.
// - Reset prompt to default puts defaultPrompt in the text named "prompt",
//   leaving the others, and says it isn't saved yet, with Undo reset, which
//   puts back what the text held before.
// - Her changes are kept in this browser until she saves or discards them
//   (local-draft.ts), so leaving the page, reloading or closing it loses
//   nothing: back on the page, the editor shows them again and says so. A
//   draft based on an older save than savedAt, the time of the save the
//   page shows, is dropped. Discard changes puts back the saved prompt.
// action receives the prompt's id as idName, the name as `name`, and each
// text by its field's name. The page keys the editor by savedAt, so a save
// starts it afresh.
export function PromptEditor({
  action,
  kind,
  idName,
  promptId,
  savedAt,
  name,
  nameMaxLength,
  texts,
  defaultPrompt,
}: {
  readonly action: (formData: FormData) => Promise<never>;
  readonly kind: PromptKind;
  readonly idName: string;
  readonly promptId: string;
  readonly savedAt: string;
  readonly name: string;
  readonly nameMaxLength?: number;
  readonly texts: readonly PromptEditorText[];
  readonly defaultPrompt: string;
}): JSX.Element {
  const draftKey = `prompt:${promptId}`;
  const [saved] = useState<PromptDraft>(() => ({
    name,
    texts: Object.fromEntries(
      texts.map(({ name: field, text }) => [field, text]),
    ),
  }));
  const [draft, setDraft] = useState(saved);
  const [notice, setNotice] = useState<Notice>("none");
  const [beforeReset, setBeforeReset] = useState<string | undefined>();
  const [nameRefused, setNameRefused] = useState<boolean>(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const resetTextRef = useRef<HTMLTextAreaElement>(null);

  // Shows next, and keeps it in this browser unless it is the saved prompt.
  const change = useCallback(
    (next: PromptDraft): void => {
      setDraft(next);
      if (sameDraft(next, saved)) {
        keepLocalDraft(draftKey, undefined);
        return;
      }
      keepLocalDraft(draftKey, { basedOn: savedAt, ...next });
    },
    [draftKey, saved, savedAt],
  );

  useEffect(() => {
    const kept = readLocalDraft(draftKey, KEPT_DRAFT);
    if (kept === undefined) {
      return;
    }
    const restored = restoredDraft(kept, saved);
    if (kept.basedOn !== savedAt || sameDraft(restored, saved)) {
      keepLocalDraft(draftKey, undefined);
      return;
    }
    setDraft(restored);
    setNotice("restored");
  }, [draftKey, saved, savedAt]);

  const changeName = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      change({ ...draft, name: event.target.value });
      setNameRefused(false);
      setNotice("none");
    },
    [change, draft],
  );
  const changeText = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      const { name: field, value } = event.target;
      change({ ...draft, texts: { ...draft.texts, [field]: value } });
      if (field === RESET_TEXT) {
        setBeforeReset(undefined);
      }
      setNotice("none");
    },
    [change, draft],
  );
  const reset = useCallback((): void => {
    const { [RESET_TEXT]: current = "" } = draft.texts;
    change({
      ...draft,
      texts: { ...draft.texts, [RESET_TEXT]: defaultPrompt },
    });
    setBeforeReset(current);
    setNotice("reset");
  }, [change, draft, defaultPrompt]);
  const undoReset = useCallback((): void => {
    if (beforeReset === undefined) {
      return;
    }
    change({ ...draft, texts: { ...draft.texts, [RESET_TEXT]: beforeReset } });
    setBeforeReset(undefined);
    setNotice("none");
    resetTextRef.current?.focus();
  }, [beforeReset, change, draft]);
  const discard = useCallback((): void => {
    change(saved);
    setBeforeReset(undefined);
    setNameRefused(false);
    setNotice("none");
    nameRef.current?.focus();
  }, [change, saved]);
  // A name of only spaces stops the form before its action runs.
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      if (draft.name.trim() !== "") {
        return;
      }
      event.preventDefault();
      setNameRefused(true);
      nameRef.current?.focus();
    },
    [draft.name],
  );

  let nameError: string | undefined;
  if (nameRefused) {
    nameError = PROMPT_COPY.needsName(kind);
  }
  let nameHint: string | undefined;
  if (nameMaxLength !== undefined) {
    nameHint = PROMPT_COPY.limit(nameMaxLength);
  }
  const changed = !sameDraft(draft, saved);

  return (
    <form
      action={action}
      className="flex flex-col gap-4"
      noValidate={true}
      onSubmit={submit}
    >
      <input name={idName} type="hidden" value={promptId} />
      <div className="panel">
        <TextField
          error={nameError}
          hint={nameHint}
          label={PROMPT_COPY.nameLabel}
          maxLength={nameMaxLength}
          name="name"
          onChange={changeName}
          ref={nameRef}
          required={true}
          value={draft.name}
        />
      </div>
      <h2 className="section-heading">{PROMPT_COPY.promptHeading}</h2>
      {texts.map(({ name: field, label, help, maxLength }) => {
        const { [field]: text = "" } = draft.texts;
        let ref: typeof resetTextRef | undefined;
        if (field === RESET_TEXT) {
          ref = resetTextRef;
        }
        return (
          <TextAreaField
            className="min-h-40 font-mono text-sm"
            hint={PROMPT_COPY.textHint(help, maxLength)}
            key={field}
            label={label}
            maxLength={maxLength}
            name={field}
            onChange={changeText}
            ref={ref}
            value={text}
          />
        );
      })}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">{PROMPT_COPY.save}</Button>
        <Button onClick={reset} variant="quiet">
          {PROMPT_COPY.resetPrompt}
        </Button>
        {changed && (
          <Button onClick={discard} variant="quiet">
            {PROMPT_COPY.discard}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <FormStatus>{NOTICE_TEXTS[notice]}</FormStatus>
        {beforeReset !== undefined && (
          <Button onClick={undoReset} variant="secondary">
            {PROMPT_COPY.undoReset}
          </Button>
        )}
      </div>
    </form>
  );
}
