"use client";

import {
  type ChangeEvent,
  type JSX,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Markdown } from "@/components/markdown.tsx";
import {
  type PromptDraft,
  PromptDraftContext,
} from "@/components/prompt-draft-context.ts";
import { Button } from "@/components/ui/button.tsx";
import { SelectField, TextAreaField } from "@/components/ui/field.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import { readAppErrorCase, userMessage } from "@/errors/app-error.ts";
import { WORKSHOP_COPY } from "@/ui/copy/workshop.ts";
import {
  WORKSHOP_LIMITS,
  WORKSHOP_RESULT,
  type WorkshopDraft,
  type WorkshopMessage,
  type WorkshopOptions,
  type WorkshopResult,
} from "@/workshop/protocol.ts";

interface TestRun {
  readonly key: string;
  readonly version: number;
  readonly history: readonly (WorkshopMessage & { readonly id: string })[];
  readonly casts: WorkshopResult["casts"];
}
interface WorkshopProps {
  readonly initial: WorkshopDraft;
  readonly options: WorkshopOptions;
  readonly children: ReactNode;
}

function Workshop({ initial, options, children }: WorkshopProps): JSX.Element {
  const [draft, setDraft] = useState(initial);
  const [buddyId, setBuddyId] = useState(options.buddies[0]?.id ?? "hippy");
  const [activityId, setActivityId] = useState("open-chat");
  const [forceCast, setForceCast] = useState<boolean>(false);
  const [message, setMessage] = useState<string>(
    WORKSHOP_COPY.examples[0].message,
  );
  const [run, setRun] = useState<TestRun>();
  const [pending, setPending] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const controllerRef = useRef<AbortController | undefined>(undefined);
  const versionRef = useRef(0);
  const key = JSON.stringify({ draft, buddyId, activityId, forceCast });
  const stale = run !== undefined && run.key !== key;
  const reportDraft = useCallback(
    (current: PromptDraft): void => {
      const {
        prompt = initial.prompt,
        whenToUse = initial.whenToUse,
        openingRequest = initial.openingRequest,
      } = current.texts;
      setDraft({
        ...initial,
        name: current.name,
        prompt,
        whenToUse,
        openingRequest,
      });
    },
    [initial],
  );
  const selectBuddy = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      setBuddyId(event.target.value);
    },
    [],
  );
  const selectActivity = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      setActivityId(event.target.value);
    },
    [],
  );
  const selectSpell = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      setForceCast(event.target.value === "true");
    },
    [],
  );
  const writeMessage = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      setMessage(event.target.value);
    },
    [],
  );
  const cancel = useCallback((): void => {
    controllerRef.current?.abort();
    controllerRef.current = undefined;
    setPending(false);
  }, []);
  useEffect(
    () => (): void => {
      controllerRef.current?.abort();
    },
    [],
  );
  const fresh = useCallback((): void => {
    cancel();
    setRun(undefined);
    setError(undefined);
  }, [cancel]);
  const selectCase = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      fresh();
      setMessage(event.currentTarget.value);
    },
    [fresh],
  );
  const runTest = useCallback(
    async (opening: boolean): Promise<void> => {
      if (pending === true) {
        return;
      }
      let history: TestRun["history"] = [];
      let casts: WorkshopResult["casts"] = [];
      let runVersion = versionRef.current + 1;
      if (run !== undefined && run.key === key && !opening) {
        ({ history, casts, version: runVersion } = run);
      }
      if (history.length >= WORKSHOP_LIMITS.history) {
        setError(WORKSHOP_COPY.longTest);
        return;
      }
      const abort = new AbortController();
      controllerRef.current = abort;
      setPending(true);
      setError(undefined);
      try {
        const response = await fetch("/api/workshop", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: abort.signal,
          body: JSON.stringify({
            draft,
            buddyId,
            activityId,
            forceCast,
            opening,
            history,
            castIds: casts.map((cast) => cast.id),
            message,
          }),
        });
        if (!response.ok) {
          throw new Error(userMessage(readAppErrorCase(await response.text())));
        }
        const parsed = WORKSHOP_RESULT.safeParse(await response.json());
        if (!parsed.success) {
          throw new Error(userMessage("unknown"));
        }
        const result = parsed.data;
        if (abort.signal.aborted) {
          return;
        }
        versionRef.current = runVersion;
        let userText = message;
        if (opening) {
          userText = result.openingText ?? draft.openingRequest;
        }
        setRun({
          key,
          version: runVersion,
          history: [
            ...history,
            { id: crypto.randomUUID(), role: "user", content: userText },
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: result.text,
            },
          ],
          casts: [
            ...new Map(
              [...casts, ...result.casts].map((cast) => [cast.id, cast]),
            ).values(),
          ],
        });
        setMessage("");
      } catch (failure) {
        if (!abort.signal.aborted) {
          let text = userMessage("unknown");
          if (failure instanceof Error) {
            text = failure.message;
          }
          setError(text);
        }
      } finally {
        if (controllerRef.current === abort) {
          controllerRef.current = undefined;
          setPending(false);
        }
      }
    },
    [pending, run, key, draft, buddyId, activityId, forceCast, message],
  );
  const send = useCallback((): Promise<void> => runTest(false), [runTest]);
  const testOpening = useCallback(
    (): Promise<void> => runTest(true),
    [runTest],
  );
  let sendLabel: string = WORKSHOP_COPY.send;
  if (run !== undefined && !stale) {
    sendLabel = WORKSHOP_COPY.followUp;
  }
  return (
    <section className="workshop" aria-label={WORKSHOP_COPY.heading}>
      <header className="flex flex-col gap-2">
        <h1 className="page-heading">{WORKSHOP_COPY.heading}</h1>
        <p className="text-muted">{WORKSHOP_COPY.intro}</p>
      </header>
      <div className="workshop-columns">
        <div className="flex min-w-0 flex-col gap-4">
          <h2 className="section-heading">{WORKSHOP_COPY.edit}</h2>
          <PromptDraftContext value={reportDraft}>
            {children}
          </PromptDraftContext>
        </div>
        <section
          className="panel flex min-w-0 flex-col gap-4"
          aria-label={WORKSHOP_COPY.test}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-heading">{WORKSHOP_COPY.test}</h2>
            <Button onClick={fresh} variant="quiet">
              {WORKSHOP_COPY.fresh}
            </Button>
          </div>
          <p className="text-muted text-sm">{WORKSHOP_COPY.gold}</p>
          <div className="flex flex-col gap-2">
            <h3 className="field-label">{WORKSHOP_COPY.cases}</h3>
            <p className="field-hint">{WORKSHOP_COPY.caseHint}</p>
            {WORKSHOP_COPY.examples.map((example) => (
              <Button
                key={example.name}
                value={example.message}
                onClick={selectCase}
                variant="secondary"
              >
                {example.name}
              </Button>
            ))}
          </div>
          {draft.kind !== "buddy" && (
            <SelectField
              label={WORKSHOP_COPY.buddy}
              onChange={selectBuddy}
              value={buddyId}
              disabled={pending}
            >
              {options.buddies.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.name}
                </option>
              ))}
            </SelectField>
          )}
          {draft.kind !== "activity" && (
            <SelectField
              label={WORKSHOP_COPY.activity}
              onChange={selectActivity}
              value={activityId}
              disabled={pending}
            >
              {options.activities.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.name}
                </option>
              ))}
            </SelectField>
          )}
          {draft.kind === "spell" && (
            <SelectField
              label={WORKSHOP_COPY.spell}
              hint={WORKSHOP_COPY.forceHint}
              onChange={selectSpell}
              value={String(forceCast)}
              disabled={pending}
            >
              <option value="false">{WORKSHOP_COPY.decide}</option>
              <option value="true">{WORKSHOP_COPY.force}</option>
            </SelectField>
          )}
          {stale === true && (
            <p role="status" className="text-muted text-sm">
              {WORKSHOP_COPY.stale}
            </p>
          )}
          {run !== undefined && (
            <p className="font-mono text-muted text-sm">
              {WORKSHOP_COPY.version(run.version)}
            </p>
          )}
          <div className="flex flex-col gap-4" aria-live="polite">
            {run === undefined && (
              <p className="text-muted">{WORKSHOP_COPY.empty}</p>
            )}
            {run?.casts.map((cast) => (
              <p className="text-primary text-sm" key={cast.id}>
                {WORKSHOP_COPY.cast(cast.name)}
              </p>
            ))}
            {run?.history.map((entry) => {
              let speaker: string = WORKSHOP_COPY.reply;
              if (entry.role === "user") {
                speaker = WORKSHOP_COPY.you;
              }
              return (
                <div
                  className="wrap-anywhere flex flex-col gap-2"
                  key={entry.id}
                >
                  <h3 className="field-label">{speaker}</h3>
                  <Markdown
                    running={false}
                    text={entry.content}
                    topHeadingLevel={4}
                  />
                </div>
              );
            })}
          </div>
          {pending === true && <p role="status">{WORKSHOP_COPY.pending}</p>}
          {error !== undefined && <Alert>{error}</Alert>}
          <TextAreaField
            label={WORKSHOP_COPY.message}
            value={message}
            onChange={writeMessage}
            maxLength={10_000}
            rows={3}
            disabled={pending}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={send}
              disabled={pending === true || message.trim() === ""}
            >
              {sendLabel}
            </Button>
            {draft.kind === "activity" && (
              <Button
                onClick={testOpening}
                disabled={pending}
                variant="secondary"
              >
                {WORKSHOP_COPY.opening}
              </Button>
            )}
            {pending === true && (
              <Button onClick={cancel} variant="quiet">
                {WORKSHOP_COPY.cancel}
              </Button>
            )}
          </div>
          <p className="text-muted text-sm">{WORKSHOP_COPY.limits}</p>
        </section>
      </div>
    </section>
  );
}

export { Workshop };
