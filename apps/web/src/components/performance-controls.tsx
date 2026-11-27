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
import { Markdown } from "@/components/markdown.tsx";
import { Button } from "@/components/ui/button.tsx";
import { TextAreaField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { usePerformanceScroll } from "@/components/use-performance-scroll.ts";
import type { Construct } from "@/constructs/index.ts";
import type { QuestId, UserId } from "@/ids.ts";
import {
  sendMessageAction,
  stopPerformanceAction,
} from "@/performances/performance-actions.ts";
import type { Performance } from "@/performances/performance-store.ts";
import { answerMessage } from "@/performances/performance-turn.ts";
import { REPLY_CHOICE } from "@/rites/rite.ts";
import { SIGN_IN_PATH } from "@/routes.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";

// A message being sent, with the reply the rite gave it in this browser.
const REQUEST = z.object({
  id: z.guid(),
  text: z.string(),
  reply: REPLY_CHOICE.optional(),
  answer: z.string(),
});
const DRAFT = z.object({ text: z.string(), request: REQUEST.optional() });
type Draft = z.infer<typeof DRAFT>;
type Request = z.infer<typeof REQUEST>;
const EMPTY: Draft = { text: "" };
function withoutDraft(): null {
  return null;
}

// The active performance's composer, under its transcript. The rite answers
// each message here in the browser, so its reply shows at once, while the
// server saves the message, its list item and the reply.
function MessageComposer({
  questId,
  performance,
  viewer,
  author,
  construct,
  answered,
  given,
  children,
}: {
  readonly questId: QuestId;
  readonly performance: Performance;
  readonly viewer: UserId;
  readonly author: string;
  readonly construct: Construct;
  // The ids of the messages saved in the performance.
  readonly answered: readonly string[];
  // The replies the rite has given in the performance, by place, in order.
  readonly given: readonly number[];
  readonly children: ReactNode;
}): JSX.Element {
  const performanceId = performance.id;
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
          id: next.id,
          text: next.text,
          reply: next.reply,
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
      const { reply, choice } = answerMessage(
        performance,
        given,
        { text, author },
        Math.random,
      );
      await send({
        text,
        id: crypto.randomUUID(),
        reply: choice,
        answer: reply,
      });
    },
    [author, given, performance, performanceId, questId, send, update],
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
          <PendingReplyHead construct={construct} saving={busy} />
          <Markdown text={request.answer} running={false} topHeadingLevel={3} />
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

// The construct above a reply the server hasn't saved yet: its portrait
// moves, and the text beside it says so, only while the reply is saving.
function PendingReplyHead({
  construct,
  saving,
}: {
  readonly construct: Construct;
  readonly saving: boolean;
}): JSX.Element {
  if (!saving) {
    return (
      <div className="flex items-center gap-2">
        <ConstructAvatar construct={construct} />
        <p className="font-semibold">{construct.name}</p>
      </div>
    );
  }
  return (
    <div
      className="performance-working flex items-center gap-2"
      data-construct={construct.id}
    >
      <ConstructAvatar construct={construct} decorative={true} />
      <span className="font-semibold">{construct.name}</span>
      <FormStatus>{PERFORMANCE_COPY.working}</FormStatus>
    </div>
  );
}

export { MessageComposer };
