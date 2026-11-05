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
}: {
  readonly construct: OwnConstruct;
  readonly viewer: string;
  readonly changed: boolean;
}): JSX.Element {
  const requestKey = `visual:${viewer}:${construct.id}`;
  const [quote, setQuote] = useState<VisualGenerationQuote>();
  const [result, setResult] = useState<VisualGenerationResult>();
  const [visual, setVisual] = useState(construct.definition.visual);
  const [request, setRequest] = useState<VisualGenerationRequest>();
  const [busy, setBusy] = useState<boolean>(false);
  const [unknown, setUnknown] = useState<boolean>(false);
  const lockedRef = useRef<boolean>(false);
  const hintId = useId();
  const description = construct.definition.visual?.description ?? "";
  const apply = useCallback(
    (next: VisualGenerationResult): void => {
      setResult(next);
      if (next.status === "generated" && next.visual !== undefined) {
        setVisual(next.visual);
      }
      if (next.status !== "pending") {
        keepLocalDraft(requestKey, undefined);
        setRequest(undefined);
      }
    },
    [requestKey],
  );
  // Reads never start paid work. Recovery also works when browser storage was lost.
  const acceptQuote = useCallback(
    (next: VisualGenerationQuote): void => {
      setQuote(next);
      setUnknown(false);
      if (next.result !== undefined) {
        apply(next.result);
      }
      if (next.pendingRequestId !== undefined) {
        const recovered = {
          constructId: construct.id,
          requestId: next.pendingRequestId,
          description,
        };
        setRequest(recovered);
        keepLocalDraft(requestKey, recovered);
      }
    },
    [construct.id, description, requestKey, apply],
  );
  const read = useCallback(
    async (requestId?: string): Promise<void> => {
      acceptQuote(await readQuote(construct.id, requestId));
    },
    [acceptQuote, construct.id],
  );
  useEffect(() => {
    let active = true;
    const kept = readLocalDraft(requestKey, VISUAL_GENERATION_REQUEST);
    readQuote(construct.id, kept?.requestId)
      .then((next) => {
        if (active) {
          acceptQuote(next);
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
  }, [acceptQuote, construct.id, requestKey]);
  const check = useCallback(async (): Promise<void> => {
    if (lockedRef.current) {
      return;
    }
    lockedRef.current = true;
    setBusy(true);
    try {
      await read(request?.requestId);
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
      changed ||
      request !== undefined ||
      quote?.available !== true ||
      description === ""
    ) {
      return;
    }
    lockedRef.current = true;
    setBusy(true);
    setUnknown(false);
    const next = {
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
      let pendingId: string | undefined;
      if (parsed.status === "pending") {
        pendingId = next.requestId;
      }
      await read(pendingId);
    } catch {
      setUnknown(true);
    } finally {
      lockedRef.current = false;
      setBusy(false);
    }
  }, [
    changed,
    request,
    quote,
    description,
    construct.id,
    requestKey,
    apply,
    read,
  ]);
  let label = VISUAL_COPY.generate;
  if (
    result !== undefined &&
    result.status !== "generated" &&
    result.status !== "pending"
  ) {
    label = VISUAL_COPY.retry;
  }
  let status = "";
  if (result !== undefined) {
    status = VISUAL_COPY.states[result.status];
  }
  if (unknown) {
    status = VISUAL_COPY.unknown;
  }
  let saveHint = "";
  if (changed) {
    saveHint = VISUAL_COPY.saveFirst;
  } else if (description === "") {
    saveHint = VISUAL_COPY.needsDescription;
  }
  return (
    <section
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
      <p className="field-hint" id={hintId}>
        {saveHint}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          aria-describedby={hintId}
          disabled={
            busy ||
            changed ||
            request !== undefined ||
            quote?.available !== true ||
            description === "" ||
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
      <FormStatus>{status}</FormStatus>
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
