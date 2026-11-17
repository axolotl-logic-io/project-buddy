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
import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui/field.tsx";
import { FormStatus } from "@/components/ui/form-message.tsx";
import { TextListField } from "@/components/ui/text-list-field.tsx";
import { parseTextList } from "@/components/ui/text-list-value.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";

// An unsaved draft as this browser keeps it (local-draft.ts), with the save
// it was based on.
const KEPT_DRAFT = z.object({
  basedOn: z.string(),
  name: z.string(),
  texts: z.record(z.string(), z.string()),
});

// One editable text field, with its label, help, saved value and optional limit.
interface PromptEditorText {
  readonly name: string;
  readonly label: string;
  readonly help: string;
  readonly text: string;
  readonly maxLength?: number;
  readonly placement?: "under-name";
  readonly list?: { readonly maxLength: number; readonly maxItems: number };
  readonly choices?: readonly {
    readonly value: string;
    readonly label: string;
  }[];
  readonly requiredMessage?: string | undefined;
}

// The name and texts the editor shows, saved or not.
interface PromptDraft {
  readonly name: string;
  readonly texts: Readonly<Record<string, string>>;
}

// What the editor last did that the user should know.
type Notice = "none" | "restored";

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
  restored: PROMPT_COPY.restored,
};

// Saves an own spell’s name and text fields. Drafts survive navigation in
// this browser until Save or Cancel; a newer savedAt invalidates an older draft.
function PromptEditor({
  action,
  kind,
  idName,
  promptId,
  savedAt,
  name,
  nameMaxLength,
  texts,
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
  // Told the draft whenever it changes, by typing, recovery or discard.
  readonly onDraftChange?: (draft: PromptDraft) => void;
  readonly onSubmitCapture?: (event: SubmitEvent<HTMLFormElement>) => void;
  readonly saveLabel?: string;
  readonly saveHint?: string | undefined;
  readonly formId?: string;
  readonly saving?: boolean;
  readonly disabled?: boolean;
  readonly action: (formData: FormData) => void | Promise<void>;
  readonly kind: "spell";
  readonly idName: string;
  readonly promptId: string;
  readonly savedAt: string;
  readonly name: string;
  readonly nameMaxLength?: number;
  readonly texts: readonly PromptEditorText[];
  readonly viewer: string;
  readonly heading: string;
}): JSX.Element {
  const saveHintId = useId();
  const sectionsId = useId();
  const sections = texts.filter((field) => field.placement !== "under-name");
  const [selectedField, setSelectedField] = useState(sections[0]?.name ?? "");
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
  const changeList = useCallback(
    (field: string, value: string): void => {
      setTextErrors({});
      change({ ...draft, texts: { ...draft.texts, [field]: value } });
      setNotice("none");
    },
    [change, draft],
  );
  const changeText = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>): void => {
      const { name: field, value } = event.target;
      setTextErrors({});
      change({ ...draft, texts: { ...draft.texts, [field]: value } });
      setNotice("none");
    },
    [change, draft],
  );
  const discard = useCallback((): void => {
    change(saved);
    setTextErrors({});
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
        if (
          text.requiredMessage !== undefined &&
          (value.trim() === "" ||
            (text.list !== undefined && parseTextList(value).length === 0))
        ) {
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
        {texts
          .filter((field) => field.placement === "under-name")
          .map((field) => {
            const { [field.name]: value = "" } = draft.texts;
            const { [field.name]: error } = textErrors;
            return (
              <SelectField
                key={field.name}
                name={field.name}
                label={field.label}
                hint={field.help}
                error={error}
                value={value}
                onChange={changeText}
              >
                {field.choices?.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </SelectField>
            );
          })}
      </div>
      <h2 className="section-heading prompt-editor-heading">{heading}</h2>
      <nav className="prompt-editor-nav" aria-label={PROMPT_COPY.sections}>
        {sections.map(({ name: field, label }) => {
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
      {sections.map(
        ({ name: field, label, help, maxLength, choices, list }) => {
          const { [field]: text = "" } = draft.texts;
          const { [field]: error } = textErrors;
          let control = (
            <TextAreaField
              className="min-h-40 font-mono text-sm"
              error={error}
              hint={help}
              key={field}
              label={label}
              maxLength={maxLength}
              name={field}
              onChange={changeText}
              value={text}
            />
          );
          if (choices !== undefined) {
            control = (
              <SelectField
                error={error}
                hint={help}
                label={label}
                name={field}
                onChange={changeText}
                value={text}
              >
                {choices.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </SelectField>
            );
          }
          if (list !== undefined) {
            control = (
              <TextListField
                name={field}
                label={label}
                hint={help}
                value={text}
                maxLength={list.maxLength}
                maxItems={list.maxItems}
                error={error}
                onChange={changeList}
              />
            );
          }
          return (
            <div
              className="prompt-editor-field"
              key={field}
              id={`${sectionsId}-${field}`}
              hidden={selectedField !== field}
            >
              {control}
            </div>
          );
        },
      )}
      <div className="prompt-editor-actions">
        {saveHint !== undefined && (
          <p className="prompt-editor-save-hint" id={saveHintId}>
            {saveHint}
          </p>
        )}
        <Button
          aria-describedby={(saveHint !== undefined && saveHintId) || undefined}
          className="self-start"
          aria-busy={saving}
          disabled={saving === true || disabled === true}
          type="submit"
        >
          {saveLabel}
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <FormStatus>{NOTICE_TEXTS[notice]}</FormStatus>
        </div>
      </div>
      {changed && (
        <div className="prompt-editor-more">
          <Button onClick={discard} variant="quiet">
            {PROMPT_COPY.discard}
          </Button>
        </div>
      )}
    </form>
  );
}

export { PromptEditor };
