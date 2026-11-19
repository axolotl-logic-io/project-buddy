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
  useSyncExternalStore,
} from "react";
import { z } from "zod";
import {
  keepLocalDraft,
  parseLocalDraft,
  readLocalDraftSnapshot,
  subscribeToLocalDraft,
} from "@/components/local-draft.ts";
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

function emptyDraftSnapshot(): null {
  return null;
}

function usePromptDraft(
  key: string,
  saved: PromptDraft,
  revision: string,
): {
  readonly draft: PromptDraft;
  readonly restored: boolean;
  readonly change: (next: PromptDraft) => void;
} {
  const subscribe = useCallback(
    (changed: () => void): (() => void) => subscribeToLocalDraft(key, changed),
    [key],
  );
  const getSnapshot = useCallback(
    (): string | null => readLocalDraftSnapshot(key),
    [key],
  );
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    emptyDraftSnapshot,
  );
  const kept = parseLocalDraft(snapshot, KEPT_DRAFT);
  const [edited, setEdited] = useState<PromptDraft | undefined>(undefined);
  let recovered: PromptDraft | undefined;
  if (kept?.basedOn === revision) {
    const candidate = restoredDraft(kept, saved);
    if (!sameDraft(candidate, saved)) {
      recovered = candidate;
    }
  }
  const stale = kept !== undefined && recovered === undefined;
  useEffect(() => {
    if (stale && getSnapshot() === snapshot) {
      keepLocalDraft(key, undefined);
    }
  }, [key, getSnapshot, snapshot, stale]);

  function change(next: PromptDraft): void {
    setEdited(next);
    if (sameDraft(next, saved)) {
      keepLocalDraft(key, undefined);
      return;
    }
    keepLocalDraft(key, { basedOn: revision, ...next });
  }
  return {
    draft: edited ?? recovered ?? saved,
    restored: edited === undefined && recovered !== undefined,
    change,
  };
}

function PromptSections({
  id,
  heading,
  sections,
  selectedField,
  draft,
  errors,
  onSelect,
  onTextChange,
  onListChange,
}: {
  readonly id: string;
  readonly heading: string;
  readonly sections: readonly PromptEditorText[];
  readonly selectedField: string;
  readonly draft: PromptDraft;
  readonly errors: Readonly<Record<string, string>>;
  readonly onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
  readonly onTextChange: (
    event: ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  readonly onListChange: (name: string, value: string) => void;
}): JSX.Element {
  return (
    <section
      className="panel prompt-editor-replies"
      aria-labelledby={`${id}-heading`}
    >
      <h2
        id={`${id}-heading`}
        className="section-heading prompt-editor-heading"
      >
        {heading}
      </h2>
      <nav className="prompt-editor-nav" aria-label={PROMPT_COPY.sections}>
        {sections.map(({ name: field, label }) => {
          const { [field]: error } = errors;
          return (
            <Button
              key={field}
              variant="quiet"
              aria-pressed={selectedField === field}
              aria-controls={`${id}-${field}`}
              value={field}
              onClick={onSelect}
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
          const { [field]: error } = errors;
          let control = (
            <TextAreaField
              className="min-h-40 font-mono text-sm"
              error={error}
              hint={help}
              key={field}
              label={label}
              maxLength={maxLength}
              name={field}
              onChange={onTextChange}
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
                onChange={onTextChange}
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
                onChange={onListChange}
              />
            );
          }
          return (
            <div
              className="prompt-editor-field"
              key={field}
              id={`${id}-${field}`}
              hidden={selectedField !== field}
            >
              {control}
            </div>
          );
        },
      )}
    </section>
  );
}

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
}: {
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
  const [{ draftKey, revision, saved }] = useState(() => ({
    draftKey: `prompt:${viewer}:${kind}:${promptId}`,
    revision: savedAt,
    saved: {
      name,
      texts: Object.fromEntries(
        texts.map(({ name: field, text }) => [field, text]),
      ),
    } satisfies PromptDraft,
  }));
  const { draft, restored, change } = usePromptDraft(draftKey, saved, revision);
  const [nameRefused, setNameRefused] = useState<boolean>(false);
  const [textErrors, setTextErrors] = useState<
    Readonly<Record<string, string>>
  >({});
  const nameRef = useRef<HTMLInputElement>(null);

  const changeName = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      change({ ...draft, name: event.target.value });
      setNameRefused(false);
    },
    [change, draft],
  );
  const changeList = useCallback(
    (field: string, value: string): void => {
      setTextErrors({});
      change({ ...draft, texts: { ...draft.texts, [field]: value } });
    },
    [change, draft],
  );
  const changeText = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>): void => {
      const { name: field, value } = event.target;
      setTextErrors({});
      change({ ...draft, texts: { ...draft.texts, [field]: value } });
    },
    [change, draft],
  );
  const discard = useCallback((): void => {
    change(saved);
    setTextErrors({});
    setNameRefused(false);
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
      <PromptSections
        id={sectionsId}
        heading={heading}
        sections={sections}
        selectedField={selectedField}
        draft={draft}
        errors={textErrors}
        onSelect={selectField}
        onTextChange={changeText}
        onListChange={changeList}
      />
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
          <FormStatus>{restored === true && PROMPT_COPY.restored}</FormStatus>
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
