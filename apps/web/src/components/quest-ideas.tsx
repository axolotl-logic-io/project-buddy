"use client";

import {
  type JSX,
  type SubmitEvent,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import {
  IDEA_REQUEST,
  IDEA_TEXT_MAX_LENGTH,
  type Idea,
  type IdeaAction,
  type IdeaRequest,
} from "@/ideas/idea.ts";
import type { QuestId } from "@/ids.ts";
import { IDEAS_COPY } from "@/ui/copy/ideas.ts";

function IdeaForm({
  questId,
  idea,
  busy,
  run,
}: {
  readonly questId: QuestId;
  readonly idea?: Idea;
  readonly busy: boolean;
  readonly run: (request: IdeaRequest) => Promise<boolean>;
}): JSX.Element {
  const inputId = useId();
  const problemId = useId();
  const [validationProblem, setValidationProblem] = useState<
    string | undefined
  >(undefined);
  const submit = useCallback(
    async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      let op = "add";
      if (idea !== undefined) {
        op = "edit";
      }
      const request = IDEA_REQUEST.safeParse({
        op,
        questId,
        id: idea?.id,
        text: data.get("text"),
      });
      if (!request.success) {
        setValidationProblem(IDEAS_COPY.invalid);
        return;
      }
      setValidationProblem(undefined);
      if ((await run(request.data)) && idea === undefined) {
        form.reset();
      }
    },
    [questId, idea, run],
  );
  const remove = useCallback(async (): Promise<void> => {
    if (idea !== undefined) {
      await run({ op: "remove", questId, id: idea.id });
    }
  }, [idea, questId, run]);
  const move = useCallback(async (): Promise<void> => {
    if (idea !== undefined) {
      await run({ op: "move", questId, id: idea.id });
    }
  }, [idea, questId, run]);
  let describedBy: string | undefined;
  if (validationProblem !== undefined) {
    describedBy = problemId;
  }
  let label: string = IDEAS_COPY.add;
  if (idea !== undefined) {
    label = IDEAS_COPY.save;
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor={inputId}>{IDEAS_COPY.label}</label>
      <input
        id={inputId}
        name="text"
        aria-invalid={validationProblem !== undefined}
        aria-describedby={describedBy}
        className="input-field"
        defaultValue={idea?.text ?? ""}
        required={true}
        maxLength={IDEA_TEXT_MAX_LENGTH}
        disabled={busy}
      />
      {validationProblem !== undefined && (
        <Alert id={problemId}>{validationProblem}</Alert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="secondary" disabled={busy}>
          {label}
        </Button>
        {idea !== undefined && (
          <>
            <Button variant="quiet" onClick={move} disabled={busy}>
              {IDEAS_COPY.move}
            </Button>
            <Button variant="quiet" onClick={remove} disabled={busy}>
              {IDEAS_COPY.remove}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

function QuestIdeas({
  questId,
  ideas: initialIdeas,
  action,
  embedded,
}: {
  readonly questId: QuestId;
  readonly ideas: readonly Idea[];
  readonly action: IdeaAction;
  readonly embedded?: boolean;
}): JSX.Element {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const run = useCallback(
    async (request: IdeaRequest): Promise<boolean> => {
      setBusy(true);
      setProblem(undefined);
      setStatus(undefined);
      try {
        const result = await action(request);
        if (result.kind === "problem") {
          setProblem(result.text);
          return false;
        }
        // Refresh supplies additions; apply edits/removals now so controls never
        // show an idea that the completed action has already removed.
        if (request.op === "edit") {
          setIdeas((current) =>
            current.map((idea) => {
              if (idea.id === request.id) {
                return { ...idea, text: request.text };
              }
              return idea;
            }),
          );
        } else if (request.op !== "add") {
          setIdeas((current) =>
            current.filter((idea) => idea.id !== request.id),
          );
          headingRef.current?.focus();
        }
        let feedback: string = IDEAS_COPY.saved;
        if (request.op === "remove") {
          feedback = IDEAS_COPY.removed;
        }
        if (request.op === "move") {
          feedback = IDEAS_COPY.moved;
        }
        setStatus(feedback);
        return true;
      } catch {
        setProblem(IDEAS_COPY.failed);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [action],
  );
  // A route refresh can add an idea or load another quest's list.
  const [previous, setPrevious] = useState(initialIdeas);
  if (previous !== initialIdeas) {
    setPrevious(initialIdeas);
    setIdeas(initialIdeas);
  }
  let Heading: "h2" | "p" = "h2";
  let headingClass = "section-heading";
  if (embedded === true) {
    Heading = "p";
    headingClass = "sr-only";
  }
  return (
    <section className="page-slot">
      <Heading ref={headingRef} tabIndex={-1} className={headingClass}>
        {IDEAS_COPY.heading}
      </Heading>
      <p className="text-muted">{IDEAS_COPY.intro}</p>
      <FormStatus>{status}</FormStatus>
      {problem !== undefined && <Alert>{problem}</Alert>}
      {ideas.length === 0 && <p className="text-muted">{IDEAS_COPY.empty}</p>}
      <ul className="flex flex-col gap-4">
        {ideas.map((idea) => (
          <li key={idea.id}>
            <IdeaForm questId={questId} idea={idea} busy={busy} run={run} />
          </li>
        ))}
      </ul>
      <IdeaForm questId={questId} busy={busy} run={run} />
    </section>
  );
}

export { QuestIdeas };
