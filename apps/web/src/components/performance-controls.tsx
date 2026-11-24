"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type JSX,
  type ReactNode,
  type SubmitEvent,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { z } from "zod";
import { ConstructAvatar } from "@/components/constructs/construct-visual.tsx";
import {
  keepLocalDraft,
  parseLocalDraft,
  readLocalDraftSnapshot,
  subscribeToLocalDraft,
} from "@/components/local-draft.ts";
import { Button } from "@/components/ui/button.tsx";
import { SelectField, TextAreaField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { usePerformanceScroll } from "@/components/use-performance-scroll.ts";
import type { Construct } from "@/constructs/index.ts";
import type { QuestId, UserId } from "@/ids.ts";
import type { List } from "@/lists/list-store.ts";
import {
  sendMessageAction,
  startPerformanceAction,
  stopPerformanceAction,
} from "@/performances/performance-actions.ts";
import type { PerformanceId } from "@/performances/performance-store.ts";
import type { Rite } from "@/rites/rite.ts";
import { SIGN_IN_PATH } from "@/routes.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";

function PerformRite({
  questId,
  rites,
  lists,
}: {
  readonly questId: QuestId;
  readonly rites: readonly Rite[];
  readonly lists: readonly List[];
}): JSX.Element {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const perform = useCallback(
    async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      setPending(true);
      setError("");
      try {
        const form = new FormData(event.currentTarget);
        setError(
          (await startPerformanceAction({
            questId,
            riteId: form.get("riteId"),
            listId: form.get("listId"),
          })) ?? "",
        );
      } catch {
        setError(PERFORMANCE_COPY.unavailable);
      } finally {
        setPending(false);
      }
    },
    [questId],
  );
  return (
    <form onSubmit={perform} className="grid gap-3">
      <SelectField label={PERFORMANCE_COPY.rite} name="riteId" required={true}>
        {rites.map((rite) => (
          <option key={rite.id} value={rite.id}>
            {rite.name}
          </option>
        ))}
      </SelectField>
      <SelectField label={PERFORMANCE_COPY.list} name="listId" required={true}>
        {lists.map((list) => (
          <option key={list.id} value={list.id}>
            {list.name}
          </option>
        ))}
      </SelectField>
      <Button type="submit" disabled={pending === true || lists.length === 0}>
        {PERFORMANCE_COPY.start}
      </Button>
      {error !== "" && <Alert>{error}</Alert>}
    </form>
  );
}

const REQUEST = z.object({ id: z.guid(), text: z.string() });
const DRAFT = z.object({ text: z.string(), request: REQUEST.optional() });
type Draft = z.infer<typeof DRAFT>;
type Request = z.infer<typeof REQUEST>;
const EMPTY: Draft = { text: "" };
function withoutDraft(): null {
  return null;
}

function MessageComposer({
  questId,
  performanceId,
  viewer,
  author,
  construct,
  answered,
  children,
}: {
  readonly questId: QuestId;
  readonly performanceId: PerformanceId;
  readonly viewer: UserId;
  readonly author: string;
  readonly construct: Construct;
  readonly answered: readonly string[];
  readonly children: ReactNode;
}): JSX.Element {
  const key = `performance:${viewer}:${performanceId}`;
  const root = usePerformanceScroll();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const subscribe = useCallback(
    (changed: () => void): (() => void) => subscribeToLocalDraft(key, changed),
    [key],
  );
  const snapshot = useCallback(
    (): string | null => readLocalDraftSnapshot(key),
    [key],
  );
  const stored = useSyncExternalStore(subscribe, snapshot, withoutDraft);
  const saved = draft ?? parseLocalDraft(stored, DRAFT) ?? EMPTY;
  const latestRef = useRef(saved);
  useLayoutEffect(() => {
    latestRef.current = saved;
  }, [saved]);
  const answeredId = saved.request?.id;
  const request =
    answeredId !== undefined && !answered.includes(answeredId) && saved.request;

  const update = useCallback(
    (value: Draft): void => {
      latestRef.current = value;
      setDraft(value);
      keepLocalDraft(key, value);
    },
    [key],
  );

  const enter = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      update({ ...latestRef.current, text: event.target.value });
    },
    [update],
  );

  const send = useCallback(
    async (next: Request): Promise<void> => {
      setBusy(true);
      setError("");
      setSignedOut(false);
      update({ ...latestRef.current, request: next });
      root.current?.dispatchEvent(new Event("send-message"));
      try {
        const result = await sendMessageAction({
          questId,
          performanceId,
          ...next,
        });
        if (result === undefined) {
          update({ text: latestRef.current.text });
        } else {
          setError(result);
          setSignedOut(result === PERFORMANCE_COPY.signedOut);
        }
      } catch {
        setError(PERFORMANCE_COPY.failed);
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [performanceId, questId, root, update],
  );

  const act = useCallback(
    async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const form = new FormData(
        event.currentTarget,
        event.nativeEvent.submitter,
      );
      if (form.get("stop") === "yes") {
        setBusy(true);
        try {
          setError(
            (await stopPerformanceAction({ questId, performanceId })) ?? "",
          );
        } catch {
          setError(PERFORMANCE_COPY.failed);
        } finally {
          setBusy(false);
        }
        return;
      }
      const { text } = latestRef.current;
      if (text.trim() === "") {
        return;
      }
      update({ text: "" });
      await send({ text, id: crypto.randomUUID() });
    },
    [performanceId, questId, send, update],
  );

  const retry = useCallback(async (): Promise<void> => {
    if (request !== false && request !== undefined) {
      await send(request);
    }
  }, [request, send]);

  return (
    <div ref={root} className="performance-thread gap-3">
      {children}
      {request !== false && request !== undefined && (
        <div className="grid min-w-0 gap-2">
          <p className="font-semibold">{author}</p>
          <p className="wrap-anywhere whitespace-pre-wrap">{request.text}</p>
          {busy === true && (
            <div
              className="performance-working flex items-center gap-2"
              data-construct={construct.id}
            >
              <ConstructAvatar construct={construct} decorative={true} />
              <span>{construct.name}</span>
              <FormStatus>{PERFORMANCE_COPY.working}</FormStatus>
            </div>
          )}
        </div>
      )}
      <form className="performance-composer grid gap-2" onSubmit={act}>
        <TextAreaField
          label={PERFORMANCE_COPY.message}
          name="text"
          ref={inputRef}
          rows={2}
          onChange={enter}
          value={saved.text}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={busy === true || saved.text.trim() === ""}
          >
            {PERFORMANCE_COPY.send}
          </Button>
          <Button
            type="submit"
            name="stop"
            value="yes"
            variant="quiet"
            disabled={busy}
          >
            {PERFORMANCE_COPY.stop}
          </Button>
          {request !== false && request !== undefined && busy === false && (
            <Button type="button" variant="quiet" onClick={retry}>
              {PERFORMANCE_COPY.retry}
            </Button>
          )}
        </div>
        {error !== "" && (
          <Alert>
            {error}
            {signedOut === true && (
              <>
                {" "}
                <Link href={SIGN_IN_PATH} className="text-link">
                  {PERFORMANCE_COPY.signIn}
                </Link>
              </>
            )}
          </Alert>
        )}
      </form>
    </div>
  );
}

export { MessageComposer, PerformRite };
