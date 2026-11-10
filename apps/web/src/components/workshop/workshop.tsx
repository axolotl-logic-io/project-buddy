"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";

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
import { EarnGoldLink } from "@/components/earn-gold-link.tsx";

import {
  type PromptDraft,
  PromptDraftContext,
} from "@/components/prompt-draft-context.ts";
import { Button } from "@/components/ui/button.tsx";
import { SelectField, TextAreaField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import { DEFAULT_CONSTRUCT_ID } from "@/constructs/index.ts";
import { readAppErrorCase, userMessage } from "@/errors/app-error.ts";
import { WORKSHOP_COPY } from "@/ui/copy/workshop.ts";
import {
  WORKSHOP_LIMITS,
  WORKSHOP_RESULT,
  type WorkshopDraft,
  type WorkshopMessage,
  type WorkshopOptions,
  type WorkshopResult,
  workshopRequestBody,
} from "@/workshop/protocol.ts";

const Markdown = dynamic(() =>
  import("@/components/markdown.tsx").then((module) => module.Markdown),
);

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

// Fit the drawer above phone keyboards that shrink only the visual viewport.
function fitTestDrawer(
  element: HTMLDivElement | null,
): (() => void) | undefined {
  const viewport = window.visualViewport;
  if (element === null || viewport === null) {
    return undefined;
  }
  function resize(): void {
    element?.style.setProperty(
      "--workshop-visible-height",
      `${viewport?.height}px`,
    );
    element?.style.setProperty(
      "--workshop-visible-top",
      `${viewport?.offsetTop}px`,
    );
  }
  viewport.addEventListener("resize", resize);
  viewport.addEventListener("scroll", resize);
  resize();
  return (): void => {
    viewport.removeEventListener("resize", resize);
    viewport.removeEventListener("scroll", resize);
  };
}

function Workshop({ initial, options, children }: WorkshopProps): JSX.Element {
  const { refresh } = useRouter();
  const [draft, setDraft] = useState(initial);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [constructId, setConstructId] = useState(
    options.constructs[0]?.id ?? DEFAULT_CONSTRUCT_ID,
  );
  const [activityId, setActivityId] = useState("open-chat");
  const [forceCast, setForceCast] = useState<boolean>(false);
  const [message, setMessage] = useState<string>(
    WORKSHOP_COPY.examples[0].message,
  );
  const [run, setRun] = useState<TestRun>();
  const [pending, setPending] = useState<boolean>(false);
  const [cancelled, setCancelled] = useState<boolean>(false);
  const [outOfGold, setOutOfGold] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const controllerRef = useRef<AbortController | undefined>(undefined);
  const versionRef = useRef(0);
  const key = JSON.stringify({ draft, constructId, activityId, forceCast });
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
  const selectConstruct = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      setConstructId(event.target.value);
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
    if (controllerRef.current === undefined) {
      return;
    }
    controllerRef.current.abort();
    controllerRef.current = undefined;
    setCancelled(true);
    setPending(false);
  }, []);
  useEffect(
    () => (): void => {
      controllerRef.current?.abort();
    },
    [],
  );
  const fresh = useCallback((): void => {
    const wasPending = controllerRef.current !== undefined;
    cancel();
    setCancelled(wasPending);
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
      setCancelled(false);
      setOutOfGold(false);
      setError(undefined);
      try {
        const response = await fetch("/api/workshop", {
          method: "POST",
          headers: { "content-type": "application/json" },
          // Keep the response as the accounting acknowledgement even when
          // the user stops waiting. Cancellation only discards the local reply.
          body: workshopRequestBody({
            draft,
            constructId,
            activityId,
            forceCast,
            opening,
            history,
            castIds: casts.map((cast) => cast.id),
            message,
          }),
        }).finally(refresh);
        if (!response.ok) {
          const errorCase = readAppErrorCase(await response.text());
          setOutOfGold(errorCase === "out-of-gold");
          throw new Error(userMessage(errorCase));
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
    [
      pending,
      run,
      key,
      draft,
      constructId,
      activityId,
      forceCast,
      message,
      refresh,
    ],
  );
  const scrollResults = useCallback(
    (element: HTMLDivElement | null): void => {
      if (element !== null && run !== undefined) {
        element.scrollTop = element.scrollHeight;
      }
    },
    [run],
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
  let status = "";
  if (pending) {
    status = WORKSHOP_COPY.pending;
  } else if (cancelled) {
    status = WORKSHOP_COPY.cancelled;
  }
  return (
    <section className="workshop" aria-label={WORKSHOP_COPY.heading}>
      <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <header className="workshop-toolbar">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Link className="text-link" href="/workshop">
              {WORKSHOP_COPY.heading}
            </Link>
            <p className="text-muted">{WORKSHOP_COPY.intro}</p>
          </div>
          <Dialog.Trigger asChild={true}>
            <Button>{WORKSHOP_COPY.test}</Button>
          </Dialog.Trigger>
        </header>
        <div className="flex min-w-0 flex-col gap-4">
          <p className="font-medium text-muted text-sm">{WORKSHOP_COPY.edit}</p>
          <PromptDraftContext value={reportDraft}>
            {children}
          </PromptDraftContext>
        </div>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="workshop-drawer"
            ref={fitTestDrawer}
            aria-describedby={undefined}
          >
            <div className="workshop-drawer-header">
              <Dialog.Title className="section-heading min-w-0">
                {WORKSHOP_COPY.test}
              </Dialog.Title>
              <div className="flex shrink-0 items-center gap-3">
                <Button onClick={fresh} variant="quiet">
                  {WORKSHOP_COPY.fresh}
                </Button>
                <Dialog.Close asChild={true}>
                  <Button variant="quiet">{WORKSHOP_COPY.close}</Button>
                </Dialog.Close>
              </div>
            </div>
            <div className="workshop-test-content" ref={scrollResults}>
              <p className="text-muted text-sm">{WORKSHOP_COPY.temporary}</p>
              <p className="text-muted text-sm">{WORKSHOP_COPY.gold}</p>
              <details className="workshop-test-settings" open={true}>
                <summary className="field-label">
                  {WORKSHOP_COPY.settings}
                </summary>
                <div className="flex flex-col gap-3">
                  <fieldset className="flex flex-col gap-2">
                    <legend className="field-label">
                      {WORKSHOP_COPY.cases}
                    </legend>
                    <p className="text-muted text-sm">
                      {WORKSHOP_COPY.caseHint}
                    </p>
                    <div className="flex flex-wrap gap-2">
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
                  </fieldset>
                  {draft.kind !== "construct" && (
                    <SelectField
                      label={WORKSHOP_COPY.construct}
                      onChange={selectConstruct}
                      value={constructId}
                      disabled={pending}
                    >
                      {options.constructs.map((choice) => (
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
                </div>
              </details>
              <details className="workshop-test-settings">
                <summary className="field-label">
                  {WORKSHOP_COPY.limitsHeading}
                </summary>
                <p className="text-muted text-sm">{WORKSHOP_COPY.limits}</p>
              </details>
              {stale === true && (
                <p role="status" className="text-muted text-sm">
                  {WORKSHOP_COPY.stale}
                </p>
              )}
              {run !== undefined && (
                <p className="text-muted text-sm tabular-nums">
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
            </div>
            <div className="workshop-feedback">
              <FormStatus>{status}</FormStatus>
              {pending === true && (
                <p className="text-muted text-sm">{WORKSHOP_COPY.cancelHint}</p>
              )}
              {error !== undefined && (
                <Alert>
                  {error}
                  {outOfGold === true && <EarnGoldLink />}
                </Alert>
              )}
            </div>
            <div className="workshop-composer">
              <TextAreaField
                label={WORKSHOP_COPY.message}
                value={message}
                onChange={writeMessage}
                maxLength={10_000}
                rows={2}
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
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

export { Workshop };
