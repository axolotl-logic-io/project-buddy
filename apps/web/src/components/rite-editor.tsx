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
import { PlaceholderLegend } from "@/components/rite-text.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { TextListField } from "@/components/ui/text-list-field.tsx";
import { parseTextList } from "@/components/ui/text-list-value.ts";
import type { UserId } from "@/ids.ts";
import {
  MAX_REPLIES,
  MAX_REPLY,
  REPLY_ORDER,
  type Rite,
} from "@/rites/rite.ts";
import { saveRiteAction } from "@/rites/rite-actions.ts";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";

const EDITOR_DRAFT = z.object({
  name: z.string(),
  firstMessage: z.string(),
  replies: z.string(),
  order: REPLY_ORDER,
  loop: z.boolean(),
  finalReply: z.string(),
});
type Draft = z.infer<typeof EDITOR_DRAFT>;
type Field = "name" | "firstMessage" | "replies" | "finalReply";

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
      order: rite?.order ?? "random",
      loop: rite?.loop ?? true,
      finalReply: rite?.finalReply ?? "",
    }),
    [rite],
  );
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<{
    readonly field?: Field;
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
  const updateOrder = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const order = REPLY_ORDER.safeParse(event.currentTarget.value).data;
      if (order !== undefined) {
        update({ ...current, order });
      }
    },
    [current, update],
  );
  const updateEnding = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      update({ ...current, loop: event.currentTarget.value === "loop" });
    },
    [current, update],
  );
  const updateFinalReply = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      update({ ...current, finalReply: event.currentTarget.value });
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
          order: current.order,
          loop: current.loop,
          finalReply: current.finalReply,
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

  function errorAt(field: Field): string | undefined {
    if (error?.field === field) {
      return error.message;
    }
    return undefined;
  }
  let marker: "number" | "bullet" = "bullet";
  if (current.order === "ordered") {
    marker = "number";
  }
  let ending: "loop" | "conclude" = "conclude";
  if (current.loop) {
    ending = "loop";
  }
  return (
    <form onSubmit={save} className="rite-editor">
      <TextField
        label={GRIMOIRE_COPY.name}
        name="name"
        value={current.name}
        onChange={updateName}
        error={errorAt("name")}
      />
      <TextAreaField
        label={GRIMOIRE_COPY.firstMessage}
        hint={GRIMOIRE_COPY.firstMessageHint}
        name="firstMessage"
        value={current.firstMessage}
        maxLength={MAX_REPLY}
        onChange={updateFirstMessage}
        error={errorAt("firstMessage")}
      />
      <SelectField
        label={GRIMOIRE_COPY.order}
        name="order"
        value={current.order}
        onChange={updateOrder}
      >
        {REPLY_ORDER.options.map((order) => (
          <option key={order} value={order}>
            {GRIMOIRE_COPY.orders[order]}
          </option>
        ))}
      </SelectField>
      <TextListField
        name="replies"
        label={GRIMOIRE_COPY.replies}
        hint={GRIMOIRE_COPY.repliesHint[current.order]}
        marker={marker}
        value={current.replies}
        maxLength={MAX_REPLY}
        maxItems={MAX_REPLIES}
        onChange={updateReplies}
        error={errorAt("replies")}
      />
      <SelectField
        label={GRIMOIRE_COPY.ending}
        name="ending"
        value={ending}
        onChange={updateEnding}
      >
        <option value="loop">{GRIMOIRE_COPY.endings.loop}</option>
        <option value="conclude">{GRIMOIRE_COPY.endings.conclude}</option>
      </SelectField>
      {!current.loop && (
        <TextAreaField
          label={GRIMOIRE_COPY.finalReply}
          hint={GRIMOIRE_COPY.finalReplyHint}
          name="finalReply"
          value={current.finalReply}
          maxLength={MAX_REPLY}
          onChange={updateFinalReply}
          error={errorAt("finalReply")}
        />
      )}
      <PlaceholderLegend />
      <div className="rite-savebar">
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
