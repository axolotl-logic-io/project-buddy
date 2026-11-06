"use client";

import {
  type ChangeEvent,
  type JSX,
  type SubmitEvent,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import { keepLocalDraft, readLocalDraft } from "@/components/local-draft.ts";
import {
  type PromptDraft,
  PromptDraftContext,
} from "@/components/prompt-draft-context.ts";
import { Button } from "@/components/ui/button.tsx";
import { TextAreaField, TextField } from "@/components/ui/field.tsx";
import { FormStatus } from "@/components/ui/form-message.tsx";
import { type PromptKind, storedPromptKind } from "@/prompts/prompt.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";

// The text Reset puts back to its default.
const RESET_TEXT = "prompt";

// An unsaved draft as this browser keeps it (local-draft.ts), with the save
// it was based on.
const KEPT_DRAFT = z.object({
  basedOn: z.string(),
  name: z.string(),
  texts: z.record(z.string(), z.string()),
  beforeReset: z.string().optional(),
});

// One of the prompt's texts, such as a construct's prompt or an activity's
// opening request: its field's name, label and help, its saved text, and
// its limit, if it has one.
interface PromptEditorText {
  readonly name: string;
  readonly label: string;
  readonly help: string;
  readonly text: string;
  readonly maxLength?: number;
  readonly literal?: boolean;
  readonly requiredMessage?: string | undefined;
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

// The editor of one of the user's own constructs, activities or spells: its
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
function PromptEditor({
  action,
  kind,
  idName,
  promptId,
  savedAt,
  name,
  nameMaxLength,
  texts,
  defaultPrompt,
  viewer,
  heading,
  formId,
  saveLabel = PROMPT_COPY.save,
  saveHint,
  onSubmitCapture,
  saving = false,
  disabled = false,
}: {
  readonly onSubmitCapture?: (event: SubmitEvent<HTMLFormElement>) => void;
  readonly saveLabel?: string;
  readonly saveHint?: string | undefined;
  readonly formId?: string;
  readonly saving?: boolean;
  readonly disabled?: boolean;
  readonly action: (formData: FormData) => void | Promise<void>;
  readonly kind: PromptKind;
  readonly idName: string;
  readonly promptId: string;
  readonly savedAt: string;
  readonly name: string;
  readonly nameMaxLength?: number;
  readonly texts: readonly PromptEditorText[];
  readonly defaultPrompt: string | undefined;
  readonly viewer: string;
  readonly heading: string;
}): JSX.Element {
  const saveHintId = useId();
  const reportDraft = useContext(PromptDraftContext);
  const draftKey = `prompt:${viewer}:${storedPromptKind(kind)}:${promptId}`;
  const [saved] = useState<PromptDraft>(() => ({
    name,
    texts: Object.fromEntries(
      texts.map(({ name: field, text }) => [field, text]),
    ),
  }));
  const [draft, setDraft] = useState(saved);
  useEffect(() => {
    reportDraft?.(draft);
  }, [reportDraft, draft]);
  const [notice, setNotice] = useState<Notice>("none");
  const [beforeReset, setBeforeReset] = useState<string | undefined>();
  const [nameRefused, setNameRefused] = useState<boolean>(false);
  const [textErrors, setTextErrors] = useState<
    Readonly<Record<string, string>>
  >({});
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
      keepLocalDraft(draftKey, { basedOn: savedAt, ...next, beforeReset });
    },
    [draftKey, saved, savedAt, beforeReset],
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
    setBeforeReset(kept.beforeReset);
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
      setTextErrors({});
      change({ ...draft, texts: { ...draft.texts, [field]: value } });
      if (field === RESET_TEXT) {
        setBeforeReset(undefined);
        keepLocalDraft(draftKey, {
          basedOn: savedAt,
          ...draft,
          texts: { ...draft.texts, [field]: value },
        });
      }
      setNotice("none");
    },
    [change, draft, draftKey, savedAt],
  );
  const reset = useCallback((): void => {
    if (defaultPrompt === undefined) {
      return;
    }
    const { [RESET_TEXT]: current = "" } = draft.texts;
    change({
      ...draft,
      texts: { ...draft.texts, [RESET_TEXT]: defaultPrompt },
    });
    const recovery = beforeReset ?? current;
    setBeforeReset(recovery);
    keepLocalDraft(draftKey, {
      basedOn: savedAt,
      ...draft,
      texts: { ...draft.texts, [RESET_TEXT]: defaultPrompt },
      beforeReset: recovery,
    });
    setNotice("reset");
  }, [change, draft, defaultPrompt, beforeReset, draftKey, savedAt]);
  const undoReset = useCallback((): void => {
    if (beforeReset === undefined) {
      return;
    }
    change({ ...draft, texts: { ...draft.texts, [RESET_TEXT]: beforeReset } });
    keepLocalDraft(draftKey, {
      basedOn: savedAt,
      ...draft,
      texts: { ...draft.texts, [RESET_TEXT]: beforeReset },
    });
    setBeforeReset(undefined);
    setNotice("none");
    resetTextRef.current?.focus();
  }, [beforeReset, change, draft, draftKey, savedAt]);
  const discard = useCallback((): void => {
    change(saved);
    setTextErrors({});
    setBeforeReset(undefined);
    setNameRefused(false);
    setNotice("none");
    nameRef.current?.focus();
  }, [change, saved]);
  // A name of only spaces stops the form before its action runs.
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      const errors: Record<string, string> = {};
      for (const text of texts) {
        const { [text.name]: value = "" } = draft.texts;
        if (text.requiredMessage !== undefined && value.trim() === "") {
          errors[text.name] = text.requiredMessage;
        }
      }
      setTextErrors(errors);
      const invalidName = draft.name.trim() === "";
      setNameRefused(invalidName);
      if (invalidName || Object.keys(errors).length > 0) {
        event.preventDefault();
        if (invalidName) {
          nameRef.current?.focus();
        } else {
          const field = event.currentTarget.elements.namedItem(
            Object.keys(errors)[0] ?? "",
          );
          if (field instanceof HTMLTextAreaElement) {
            field.focus();
          }
        }
      }
    },
    [draft, texts],
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
      id={formId}
      aria-busy={saving}
      className="flex flex-col gap-4"
      noValidate={true}
      onSubmit={submit}
      onSubmitCapture={onSubmitCapture}
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
      <h2 className="section-heading">{heading}</h2>
      {texts.map(({ name: field, label, help, maxLength, literal }) => {
        const { [field]: text = "" } = draft.texts;
        const { [field]: error } = textErrors;
        let ref: typeof resetTextRef | undefined;
        if (field === RESET_TEXT) {
          ref = resetTextRef;
        }
        let hint = PROMPT_COPY.textHint(help, maxLength);
        if (literal === true) {
          hint = help;
        }
        return (
          <TextAreaField
            className="min-h-40 font-mono text-sm"
            error={error}
            hint={hint}
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
      {saveHint !== undefined && <p id={saveHintId}>{saveHint}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          aria-describedby={(saveHint !== undefined && saveHintId) || undefined}
          disabled={saving === true || disabled === true}
          type="submit"
        >
          {saveLabel}
        </Button>
        {defaultPrompt !== undefined && (
          <Button onClick={reset} variant="quiet">
            {PROMPT_COPY.resetPrompt}
          </Button>
        )}
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

export { PromptEditor };
