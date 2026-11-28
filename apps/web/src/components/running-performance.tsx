"use client";

import {
  type JSX,
  type ReactNode,
  startTransition,
  useCallback,
  useMemo,
  useOptimistic,
} from "react";
import { MessageComposer } from "@/components/performance-controls.tsx";
import {
  PerformanceStartContext,
  type Stage,
  usePerformanceStart,
} from "@/components/performance-start.ts";
import { PerformanceTranscript } from "@/components/performance-transcript.tsx";
import { newPerformanceId } from "@/ids.ts";
import type { List } from "@/lists/list-store.ts";
import { startPerformanceAction } from "@/performances/performance-actions.ts";
import type { Performance } from "@/performances/performance-store.ts";
import { RITE_DEFINITION, type Rite } from "@/rites/rite.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";

// A performance's section: its rite's name, then its composer around its
// transcript. The quest page renders it with the server's performance; a
// performance started here renders the same, under the same key, so the
// server's takes its place without moving anything or losing focus.
function RunningPerformance({
  performance,
  stage,
  answered,
  given,
  children,
}: {
  readonly performance: Performance;
  readonly stage: Stage;
  readonly answered: readonly string[];
  readonly given: readonly number[];
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <section aria-label={performance.rite.name} className="quest-section-body">
      <h2 className="section-heading" data-performance-heading="" tabIndex={-1}>
        {performance.rite.name}
      </h2>
      <MessageComposer
        key={performance.id}
        questId={stage.questId}
        performance={performance}
        viewer={stage.viewer}
        author={stage.author}
        construct={stage.construct}
        answered={answered}
        given={given}
      >
        {children}
      </MessageComposer>
    </section>
  );
}

// Where the quest page shows its running performance: the server's, or one
// the user has just started.
function PerformanceSlot({
  children,
}: {
  readonly children: ReactNode;
}): ReactNode {
  const { started, stage } = usePerformanceStart();
  if (children !== undefined && children !== null) {
    return children;
  }
  if (started === undefined) {
    return null;
  }
  return (
    <RunningPerformance
      answered={[]}
      given={[]}
      key={started.id}
      performance={started}
      stage={stage}
    >
      <PerformanceTranscript
        construct={stage.construct}
        entries={[]}
        performance={started}
      />
    </RunningPerformance>
  );
}

// A quest page's performances: the one the user starts shows at once, from
// the rite they chose, and the server's takes its place.
function PerformanceStarts({
  stage,
  children,
}: {
  readonly stage: Stage;
  readonly children: ReactNode;
}): JSX.Element {
  const [started, showStarted] = useOptimistic<Performance | undefined>(
    undefined,
  );
  const { questId } = stage;
  const start = useCallback(
    (
      rite: Rite,
      list: Pick<List, "id" | "name" | "type">,
      refused: (problem: string) => void,
    ): void => {
      const performance: Performance = {
        id: newPerformanceId(),
        rite: RITE_DEFINITION.parse(rite),
        listId: list.id,
        listName: list.name,
        listType: list.type,
        startedAt: new Date(),
        endedAt: null,
        added: 0,
        closing: null,
      };
      startTransition(async () => {
        showStarted(performance);
        let problem: string | undefined = PERFORMANCE_COPY.unavailable;
        try {
          problem = await startPerformanceAction({
            id: performance.id,
            questId,
            riteId: rite.id,
            listId: list.id,
          });
        } catch {
          // The server didn't answer, so the performance is taken away.
        }
        if (problem !== undefined) {
          const why = problem;
          startTransition(() => refused(why));
        }
      });
    },
    [questId, showStarted],
  );
  const value = useMemo(
    () => ({ started, stage, start }),
    [started, stage, start],
  );
  return (
    <PerformanceStartContext value={value}>{children}</PerformanceStartContext>
  );
}

export { PerformanceSlot, PerformanceStarts, RunningPerformance };
