"use client";

import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type JSX,
  type SubmitEvent,
  useCallback,
  useMemo,
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
import { TextAreaField, TextField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { TextListField } from "@/components/ui/text-list-field.tsx";
import { parseTextList } from "@/components/ui/text-list-value.ts";
import type { UserId } from "@/ids.ts";
import { MAX_REPLIES, MAX_REPLY, type Rite } from "@/rites/rite.ts";
import { saveRiteAction } from "@/rites/rite-actions.ts";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";

const EDITOR_DRAFT = z.object({
  name: z.string(),
  firstMessage: z.string(),
  replies: z.string(),
});
type Draft = z.infer<typeof EDITOR_DRAFT>;

function serverSnapshot(): null {
  return null;
}

function RiteEditor({
  viewer,
  rite,
}: {
  readonly viewer: UserId;
  readonly rite?: Rite;
}): JSX.Element {
  const router = useRouter();
  const id = rite?.id;
  const key = `rite:${viewer}:${id ?? "new"}:${rite?.updatedAt?.toISOString() ?? ""}`;
  const savedDraft = useMemo(
    (): Draft => ({
      name: rite?.name ?? "",
      firstMessage: rite?.firstMessage ?? "",
      replies: JSON.stringify(rite?.replies ?? []),
    }),
    [rite],
  );
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<{
    readonly field?: "name" | "firstMessage" | "replies";
    readonly message: string;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const subscribe = useCallback(
    (changed: () => void): (() => void) => subscribeToLocalDraft(key, changed),
    [key],
  );
  const snapshot = useCallback(
    (): string | null => readLocalDraftSnapshot(key),
    [key],
  );
  const stored = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const current = draft ?? parseLocalDraft(stored, EDITOR_DRAFT) ?? savedDraft;
  const update = useCallback(
    (next: Draft): void => {
      setSaved(false);
      setDraft(next);
      keepLocalDraft(key, next);
    },
    [key],
  );
  const updateName = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      update({ ...current, name: event.currentTarget.value });
    },
    [current, update],
  );
  const updateFirstMessage = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      update({ ...current, firstMessage: event.currentTarget.value });
    },
    [current, update],
  );
  const updateReplies = useCallback(
    (_field: string, replies: string): void => {
      update({ ...current, replies });
    },
    [current, update],
  );
  const cancel = useCallback((): void => {
    keepLocalDraft(key, undefined);
    setDraft(savedDraft);
    setError(null);
    setSaved(false);
  }, [key, savedDraft]);
  const save = useCallback(
    async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const form = event.currentTarget;
      setPending(true);
      setError(null);
      setSaved(false);
      try {
        const result = await saveRiteAction({
          id,
          name: current.name,
          firstMessage: current.firstMessage,
          replies: parseTextList(current.replies),
        });
        if (result.kind === "saved") {
          keepLocalDraft(key, undefined);
          setSaved(true);
          if (id === undefined) {
            router.push(`/grimoire/${result.id}`);
          }
        } else if (result.kind === "invalid") {
          setError(result);
          const input = form.querySelector<HTMLElement>(
            `[name="${result.field}"]`,
          );
          input?.focus();
        } else {
          setError({ message: GRIMOIRE_COPY.unavailable });
        }
      } catch {
        setError({ message: GRIMOIRE_COPY.unavailable });
      } finally {
        setPending(false);
      }
    },
    [current, id, key, router],
  );

  let nameError: string | undefined;
  let firstMessageError: string | undefined;
  let repliesError: string | undefined;
  if (error?.field === "name") {
    nameError = error.message;
  }
  if (error?.field === "firstMessage") {
    firstMessageError = error.message;
  }
  if (error?.field === "replies") {
    repliesError = error.message;
  }
  return (
    <form onSubmit={save} className="grid gap-3">
      <TextField
        label={GRIMOIRE_COPY.name}
        name="name"
        value={current.name}
        onChange={updateName}
        error={nameError}
      />
      <TextAreaField
        label={GRIMOIRE_COPY.firstMessage}
        hint={GRIMOIRE_COPY.firstMessageHint}
        name="firstMessage"
        value={current.firstMessage}
        maxLength={MAX_REPLY}
        onChange={updateFirstMessage}
        error={firstMessageError}
      />
      <TextListField
        name="replies"
        label={GRIMOIRE_COPY.replies}
        hint={GRIMOIRE_COPY.hint}
        value={current.replies}
        maxLength={MAX_REPLY}
        maxItems={MAX_REPLIES}
        onChange={updateReplies}
        error={repliesError}
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {GRIMOIRE_COPY.save}
        </Button>
        <Button variant="quiet" onClick={cancel} disabled={pending}>
          {GRIMOIRE_COPY.cancel}
        </Button>
      </div>
      {error !== null && error.field === undefined && (
        <Alert>{error.message}</Alert>
      )}
      <FormStatus>{saved === true && GRIMOIRE_COPY.saved}</FormStatus>
    </form>
  );
}

export { RiteEditor };
