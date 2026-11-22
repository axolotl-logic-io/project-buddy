"use client";

import { type JSX, type SubmitEvent, useCallback, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { SelectField, TextAreaField } from "@/components/ui/field.tsx";
import { Alert, FormStatus } from "@/components/ui/form-message.tsx";
import type { QuestId } from "@/ids.ts";
import {
  conjureAction,
  startPerformanceAction,
  stopPerformanceAction,
} from "@/performances/performance-actions.ts";
import type { PerformanceId } from "@/performances/performance-store.ts";
import type { Rite } from "@/rites/rite.ts";
import type { Space } from "@/spaces/space-store.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";

function PerformRite({
  questId,
  rites,
  spaces,
}: {
  readonly questId: QuestId;
  readonly rites: readonly Rite[];
  readonly spaces: readonly Space[];
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
            spaceId: form.get("spaceId"),
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
      <SelectField
        label={PERFORMANCE_COPY.space}
        name="spaceId"
        required={true}
      >
        {spaces.map((space) => (
          <option key={space.id} value={space.id}>
            {space.name}
          </option>
        ))}
      </SelectField>
      <Button type="submit" disabled={pending === true || spaces.length === 0}>
        {PERFORMANCE_COPY.start}
      </Button>
      {error !== "" && <Alert>{error}</Alert>}
    </form>
  );
}

function Conjure({
  questId,
  performanceId,
}: {
  readonly questId: QuestId;
  readonly performanceId: PerformanceId;
}): JSX.Element {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [sending, setSending] = useState<{
    readonly text: string;
    readonly id: string;
  } | null>(null);
  const act = useCallback(
    async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const form = event.currentTarget;
      const values = new FormData(form, event.nativeEvent.submitter);
      setPending(true);
      setError("");
      try {
        if (values.get("stop") === "yes") {
          setError(
            (await stopPerformanceAction({ questId, performanceId })) ?? "",
          );
          return;
        }
        const text = values.get("text");
        if (typeof text !== "string" || text.trim() === "") {
          return;
        }
        let id = crypto.randomUUID();
        if (sending !== null && sending.text === text) {
          ({ id } = sending);
        }
        setSending({ text, id });
        const problem = await conjureAction({
          questId,
          performanceId,
          id,
          text,
        });
        if (problem === undefined) {
          form.reset();
          setSending(null);
        }
        setError(problem ?? "");
      } catch {
        setError(PERFORMANCE_COPY.unavailable);
      } finally {
        setPending(false);
      }
    },
    [questId, performanceId, sending],
  );
  return (
    <form className="grid gap-3" onSubmit={act}>
      <TextAreaField
        label={PERFORMANCE_COPY.conjuration}
        name="text"
        required={true}
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {PERFORMANCE_COPY.send}
        </Button>
        <Button
          type="submit"
          name="stop"
          value="yes"
          formNoValidate={true}
          variant="quiet"
          disabled={pending}
        >
          {PERFORMANCE_COPY.stop}
        </Button>
      </div>
      <FormStatus>{pending === true && PERFORMANCE_COPY.working}</FormStatus>
      {error !== "" && <Alert>{error}</Alert>}
    </form>
  );
}

export { Conjure, PerformRite };
