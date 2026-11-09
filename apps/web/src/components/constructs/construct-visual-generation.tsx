"use client";

import {
  type JSX,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { ConstructVisualPreview } from "@/components/constructs/construct-visual-preview.tsx";
import { keepLocalDraft, readLocalDraft } from "@/components/local-draft.ts";
import { Button } from "@/components/ui/button.tsx";
import { FormStatus } from "@/components/ui/form-message.tsx";
import type { OwnConstruct } from "@/constructs/construct-store.ts";
import { restoreVisualAction } from "@/constructs/restore-visual-action.ts";
import type { ConstructVisual } from "@/constructs/visual.ts";
import {
  VISUAL_GENERATION_QUOTE,
  VISUAL_GENERATION_REQUEST,
  VISUAL_GENERATION_RESULT,
  type VisualGenerationQuote,
  type VisualGenerationRequest,
  type VisualGenerationResult,
} from "@/constructs/visual-generation-contract.ts";
import { VISUAL_COPY } from "@/ui/copy/construct-visuals.ts";

async function readQuote(
  constructId: string,
  requestId?: string,
): Promise<VisualGenerationQuote> {
  const query = new URLSearchParams({ constructId });
  if (requestId !== undefined) {
    query.set("requestId", requestId);
  }
  const response = await fetch(`/api/constructs/visuals/generate?${query}`);
  if (!response.ok) {
    throw new Error("visual-status");
  }
  const quote = VISUAL_GENERATION_QUOTE.parse(await response.json());
  if (requestId !== undefined && quote.result === undefined) {
    throw new Error("visual-status-missing");
  }
  return quote;
}

function ConstructVisualGeneration({
  construct,
  viewer,
  changed,
  draftDescription,
  saving = false,
  generating = saving,
  onBlockedChange,
  onQuoteChange,
}: {
  readonly onQuoteChange?: (quote: VisualGenerationQuote) => void;
  readonly draftDescription?: string;
  readonly saving?: boolean;
  readonly generating?: boolean;
  readonly onBlockedChange?: (blocked: boolean) => void;
  readonly construct: OwnConstruct;
  readonly viewer: string;
  readonly changed: boolean;
}): JSX.Element {
  const [restored, setRestored] = useState(false);
  const requestKey = `visual:${viewer}:${construct.id}`;
  const [quote, setQuote] = useState<VisualGenerationQuote>();
  const [result, setResult] = useState<VisualGenerationResult>();
  const [visualResult, setVisualResult] = useState<
    | {
        readonly source: ConstructVisual | undefined;
        readonly visual: ConstructVisual;
      }
    | undefined
  >(undefined);
  let { visual } = construct.definition;
  if (
    visualResult !== undefined &&
    visualResult.source === construct.definition.visual
  ) {
    ({ visual } = visualResult);
  }
  const [request, setRequest] = useState<VisualGenerationRequest>();
  const [busy, setBusy] = useState<boolean>(false);
  const [unclaimed, setUnclaimed] = useState<boolean>(false);
  const [unknown, setUnknown] = useState<boolean>(false);
  useEffect(() => {
    onBlockedChange?.(busy || request !== undefined);
  }, [busy, request, onBlockedChange]);
  const lockedRef = useRef<boolean>(false);
  const hintId = useId();
  const savedDescription = construct.definition.visual?.description ?? "";
  const description = draftDescription ?? savedDescription;
  const needsDescription = (draftDescription ?? description).trim() === "";
  const apply = useCallback(
    (next: VisualGenerationResult): void => {
      setResult(next);
      if (next.status === "generated" && next.visual !== undefined) {
        setVisualResult({
          source: construct.definition.visual,
          visual: next.visual,
        });
      }
      if (next.status !== "pending") {
        keepLocalDraft(requestKey, undefined);
        setRequest(undefined);
      }
    },
    [requestKey, construct.definition.visual],
  );
  // Reads never start paid work. Recovery also works when browser storage was lost.
  const acceptQuote = useCallback(
    (
      next: VisualGenerationQuote,
      unresolved?: VisualGenerationRequest,
    ): void => {
      setQuote(next);
      onQuoteChange?.(next);
      setUnknown(false);
      const missingClaim =
        unresolved !== undefined && next.result?.status === "not-found";
      setUnclaimed(missingClaim && next.available);
      if (missingClaim && !next.available) {
        apply({
          status: "unavailable",
          reservationGold: next.reservationGold,
          roles: {
            avatar: "failed",
            portrait: "failed",
            opening: "failed",
            working: "failed",
          },
        });
      } else if (missingClaim) {
        setRequest(unresolved);
        setResult(undefined);
      } else if (next.result !== undefined) {
        apply(next.result);
      }
      if (next.pendingRequestId !== undefined) {
        let recovered: VisualGenerationRequest = {
          constructId: construct.id,
          requestId: next.pendingRequestId,
          description: next.pendingDescription ?? savedDescription,
        };
        if (
          unresolved?.requestId === next.pendingRequestId &&
          next.pendingDescription === undefined
        ) {
          recovered = unresolved;
        }
        setRequest(recovered);
        keepLocalDraft(requestKey, recovered);
      }
    },
    [construct.id, savedDescription, requestKey, apply, onQuoteChange],
  );
  const read = useCallback(
    async (unresolved?: VisualGenerationRequest): Promise<void> => {
      acceptQuote(
        await readQuote(construct.id, unresolved?.requestId),
        unresolved,
      );
    },
    [acceptQuote, construct.id],
  );
  useEffect(() => {
    if (saving === true) {
      return;
    }
    let active = true;
    const kept = readLocalDraft(requestKey, VISUAL_GENERATION_REQUEST);
    readQuote(construct.id, kept?.requestId)
      .then((next) => {
        if (active) {
          acceptQuote(next, kept);
        }
      })
      .catch(() => {
        if (active) {
          setUnknown(true);
          setRequest(kept);
        }
      });
    return (): void => {
      active = false;
    };
  }, [acceptQuote, construct.id, requestKey, saving]);
  const check = useCallback(async (): Promise<void> => {
    if (lockedRef.current) {
      return;
    }
    lockedRef.current = true;
    setBusy(true);
    try {
      await read(request);
    } catch {
      setUnknown(true);
    } finally {
      lockedRef.current = false;
      setBusy(false);
    }
  }, [read, request]);
  const generate = useCallback(async (): Promise<void> => {
    if (
      lockedRef.current ||
      saving === true ||
      (request !== undefined && !unclaimed) ||
      quote?.available !== true ||
      description === ""
    ) {
      return;
    }
    lockedRef.current = true;
    setBusy(true);
    setUnknown(false);
    setUnclaimed(false);
    setRestored(false);
    const next = request ?? {
      constructId: construct.id,
      requestId: crypto.randomUUID(),
      description,
    };
    // Persist before sending: a lost response must never lead to a new paid UUID.
    keepLocalDraft(requestKey, next);
    setRequest(next);
    setResult({
      status: "pending",
      reservationGold: quote.reservationGold,
      roles: {
        avatar: "pending",
        portrait: "pending",
        opening: "pending",
        working: "pending",
      },
    });
    try {
      const response = await fetch("/api/constructs/visuals/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      const parsed = VISUAL_GENERATION_RESULT.parse(await response.json());
      apply(parsed);
      if (parsed.status === "not-found") {
        setQuote(undefined);
        return;
      }
      let pending: VisualGenerationRequest | undefined;
      if (parsed.status === "pending") {
        pending = next;
      }
      await read(pending);
    } catch {
      setUnknown(true);
    } finally {
      lockedRef.current = false;
      setBusy(false);
    }
  }, [
    saving,
    request,
    unclaimed,
    quote,
    description,
    construct.id,
    requestKey,
    apply,
    read,
  ]);
  const restore = useCallback(async (): Promise<void> => {
    if (
      lockedRef.current ||
      changed ||
      saving === true ||
      request !== undefined
    ) {
      return;
    }
    lockedRef.current = true;
    setBusy(true);
    try {
      const success = await restoreVisualAction(construct.id);
      setRestored(success);
      if (success) {
        setQuote((previous) => {
          if (previous === undefined) {
            return previous;
          }
          return { ...previous, canRestore: false };
        });
      }
      if (!success) {
        await read();
      }
    } catch {
      setUnknown(true);
    } finally {
      lockedRef.current = false;
      setBusy(false);
    }
  }, [changed, saving, request, construct.id, read]);
  let label = VISUAL_COPY.generate;
  if (
    result !== undefined &&
    result.status !== "generated" &&
    result.status !== "pending"
  ) {
    label = VISUAL_COPY.retry;
  }
  if (unclaimed) {
    label = VISUAL_COPY.resume;
  }
  let status = "";
  if (result !== undefined) {
    status = VISUAL_COPY.states[result.status];
  }
  if (unclaimed) {
    status = VISUAL_COPY.unclaimed;
  }
  if (unknown) {
    status = VISUAL_COPY.unknown;
  }
  let saveHint = "";
  if (needsDescription) {
    saveHint = VISUAL_COPY.needsDescription;
  }
  return (
    <section
      aria-busy={busy || saving === true || result?.status === "pending"}
      className="flex min-w-0 flex-col gap-4"
      aria-label={VISUAL_COPY.heading}
    >
      <h2 className="section-heading">{VISUAL_COPY.heading}</h2>
      <p className="text-muted">{VISUAL_COPY.explanation}</p>
      {quote !== undefined && (
        <p>{VISUAL_COPY.reservation(quote.reservationGold)}</p>
      )}
      {quote?.available === false && <p>{VISUAL_COPY.states.unavailable}</p>}
      {quote?.outdated === true && <p>{VISUAL_COPY.outdated}</p>}
      {quote?.freshnessUnknown === true && (
        <p>{VISUAL_COPY.freshnessUnknown}</p>
      )}
      <p className="field-hint" id={hintId}>
        {saveHint}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          aria-describedby={hintId}
          type="button"
          name="generateImages"
          value="true"
          disabled={
            busy ||
            saving === true ||
            (request !== undefined && !unclaimed) ||
            quote?.available !== true ||
            needsDescription ||
            unknown
          }
          onClick={generate}
        >
          {label}
        </Button>
        {(request !== undefined || unknown || quote?.available === false) && (
          <Button disabled={busy} onClick={check} variant="secondary">
            {VISUAL_COPY.check}
          </Button>
        )}
      </div>
      {(generating === true || busy || result?.status === "pending") && (
        <div role="status" className="flex items-center gap-3">
          <span className="construct-generation-spinner" aria-hidden="true" />
          {VISUAL_COPY.generating}
        </div>
      )}
      {quote?.canRestore === true && (
        <div className="flex flex-col gap-2">
          <p className="field-hint">{VISUAL_COPY.restoreHint}</p>
          <Button
            onClick={restore}
            disabled={
              busy || changed || saving === true || request !== undefined
            }
            variant="secondary"
          >
            {VISUAL_COPY.restore}
          </Button>
        </div>
      )}
      <FormStatus>{status}</FormStatus>
      <FormStatus>{restored === true && VISUAL_COPY.restored}</FormStatus>
      <ConstructVisualPreview
        construct={{
          name: construct.name,
          definition: { ...construct.definition, visual },
        }}
        destination={{ kind: "construct", id: construct.id }}
        roles={result?.roles}
      />
    </section>
  );
}

export { ConstructVisualGeneration };
