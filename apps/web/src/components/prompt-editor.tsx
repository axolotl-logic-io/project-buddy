"use client";

import {
  type ChangeEvent,
  type JSX,
  type MouseEvent,
  type SubmitEvent,
  useCallback,
  useEffect,
  useId,
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

// An unsaved draft as this browser keeps it (local-draft.ts), with the save
// it was based on.
const KEPT_DRAFT = z.object({
  basedOn: z.string(),
  name: z.string(),
  texts: z.record(z.string(), z.string()),
  beforeReset: z.string().optional(),
});

// One editable text field, with its label, help, saved value and optional limit.
interface PromptEditorText {
  readonly name: string;
  readonly label: string;
  readonly help: string;
  readonly text: string;
  readonly maxLength?: number;
  readonly literal?: boolean;
  readonly requiredMessage?: string | undefined;
}

// The name and texts the editor shows, saved or not.
interface PromptDraft {
  readonly name: string;
  readonly texts: Readonly<Record<string, string>>;
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

// Saves an own construct’s name and text fields. Drafts survive navigation in
// this browser until Save or Cancel; a newer savedAt invalidates an older draft.
// Reset affects only the prompt draft and can be undone before saving.
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
  onDraftChange,
}: {
  // Told the draft whenever it changes, by typing or by recovery, reset,
  // undo or discard.
  readonly onDraftChange?: (draft: PromptDraft) => void;
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
  const sectionsId = useId();
  const [selectedField, setSelectedField] = useState(texts[0]?.name ?? "");
  const [focusField, setFocusField] = useState<string | undefined>(undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const selectField = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      setSelectedField(event.currentTarget.value);
    },
    [],
  );
  useEffect(() => {
    if (focusField === undefined) {
      return;
    }
    const field = formRef.current?.elements.namedItem(focusField);
    if (field instanceof HTMLElement) {
      field.focus();
    }
    setFocusField(undefined);
  }, [focusField]);
  const draftKey = `prompt:${viewer}:${kind}:${promptId}`;
  const [saved] = useState<PromptDraft>(() => ({
    name,
    texts: Object.fromEntries(
      texts.map(({ name: field, text }) => [field, text]),
    ),
  }));
  const [draft, setDraft] = useState(saved);
  useEffect(() => {
    onDraftChange?.(draft);
  }, [onDraftChange, draft]);
  const [notice, setNotice] = useState<Notice>("none");
  const [beforeReset, setBeforeReset] = useState<string | undefined>();
  const [nameRefused, setNameRefused] = useState<boolean>(false);
  const [textErrors, setTextErrors] = useState<
    Readonly<Record<string, string>>
  >({});
  const nameRef = useRef<HTMLInputElement>(null);

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
    setSelectedField(RESET_TEXT);
    setFocusField(RESET_TEXT);
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
    setSelectedField(RESET_TEXT);
    setFocusField(RESET_TEXT);
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
          const firstError = Object.keys(errors)[0] ?? "";
          setSelectedField(firstError);
          setFocusField(firstError);
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
      className="prompt-editor"
      ref={formRef}
      noValidate={true}
      onSubmit={submit}
      onSubmitCapture={onSubmitCapture}
    >
      <input name={idName} type="hidden" value={promptId} />
      <div className="panel prompt-editor-name">
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
      <h2 className="section-heading prompt-editor-heading">{heading}</h2>
      <nav className="prompt-editor-nav" aria-label={PROMPT_COPY.sections}>
        {texts.map(({ name: field, label }) => {
          const { [field]: error } = textErrors;
          return (
            <Button
              key={field}
              variant="quiet"
              aria-pressed={selectedField === field}
              aria-controls={`${sectionsId}-${field}`}
              value={field}
              onClick={selectField}
            >
              {label}
              {error !== undefined && (
                <span className="text-danger">{PROMPT_COPY.sectionError}</span>
              )}
            </Button>
          );
        })}
      </nav>
      {texts.map(({ name: field, label, help, maxLength, literal }) => {
        const { [field]: text = "" } = draft.texts;
        const { [field]: error } = textErrors;
        let hint = PROMPT_COPY.textHint(help, maxLength);
        if (literal === true) {
          hint = help;
        }
        return (
          <div
            className="prompt-editor-field"
            key={field}
            id={`${sectionsId}-${field}`}
            hidden={selectedField !== field}
          >
            <TextAreaField
              className="min-h-40 font-mono text-sm"
              error={error}
              hint={hint}
              key={field}
              label={label}
              maxLength={maxLength}
              name={field}
              onChange={changeText}
              value={text}
            />
          </div>
        );
      })}
      <div className="prompt-editor-actions">
        {saveHint !== undefined && (
          <p className="prompt-editor-save-hint" id={saveHintId}>
            {saveHint}
          </p>
        )}
        <Button
          aria-describedby={(saveHint !== undefined && saveHintId) || undefined}
          className="self-start"
          disabled={saving === true || disabled === true}
          type="submit"
        >
          {saveLabel}
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <FormStatus>{NOTICE_TEXTS[notice]}</FormStatus>
          {beforeReset !== undefined && (
            <Button onClick={undoReset} variant="secondary">
              {PROMPT_COPY.undoReset}
            </Button>
          )}
        </div>
      </div>
      {(defaultPrompt !== undefined || changed) && (
        <div className="prompt-editor-more">
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
      )}
    </form>
  );
}

export { PromptEditor };
