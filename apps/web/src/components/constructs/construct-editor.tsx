"use client";

import {
  type ComponentProps,
  type JSX,
  type SubmitEvent,
  useActionState,
  useCallback,
  useContext,
  useId,
  useState,
} from "react";
import { ConstructVisualGeneration } from "@/components/constructs/construct-visual-generation.tsx";
import { keepLocalDraft } from "@/components/local-draft.ts";
import {
  type PromptDraft,
  PromptDraftContext,
} from "@/components/prompt-draft-context.ts";
import { PromptEditor } from "@/components/prompt-editor.tsx";
import type { OwnConstruct } from "@/constructs/construct-store.ts";
import { normalizeVisualDescription } from "@/constructs/visual.ts";

import type { VisualGenerationQuote } from "@/constructs/visual-generation-contract.ts";
import { VISUAL_COPY } from "@/ui/copy/construct-visuals.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";

function generationRequested(
  form: FormData,
  savedDescription: string,
): boolean {
  const value = form.get("visualDescription");
  if (typeof value !== "string") {
    return false;
  }
  const description = normalizeVisualDescription(value);
  return (
    description !== "" &&
    (description !== normalizeVisualDescription(savedDescription) ||
      form.get("generateImages") === "true")
  );
}

function ConstructEditor({
  construct,
  ...editor
}: ComponentProps<typeof PromptEditor> & {
  readonly construct: OwnConstruct;
}): JSX.Element {
  const { action, viewer } = editor;
  const formId = useId();
  const [generatingSave, setGeneratingSave] = useState<boolean>(false);
  const [quote, setQuote] = useState<VisualGenerationQuote>();
  const [generationBlocked, setGenerationBlocked] = useState<boolean>(false);
  const [, save, saving] = useActionState(
    async (_previous: null, form: FormData): Promise<null> => {
      const value = form.get("visualDescription");
      let description = "";
      if (typeof value === "string") {
        description = normalizeVisualDescription(value);
      }
      const generate = generationRequested(
        form,
        construct.definition.visual?.description ?? "",
      );
      // A text-only save must not put an older tab's unchanged appearance
      // over a newer saved description or unexpectedly start paid work.
      if (
        !generate &&
        description ===
          normalizeVisualDescription(
            construct.definition.visual?.description ?? "",
          )
      ) {
        form.delete("visualDescription");
      }
      if (generate && quote?.available !== false) {
        const request = {
          constructId: construct.id,
          requestId: crypto.randomUUID(),
          description,
        };
        keepLocalDraft(`visual:${viewer}:${construct.id}`, request);
        form.set("visualRequestId", request.requestId);
      }
      await action(form);
      return null;
    },
    null,
  );
  const captureSubmission = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      setGeneratingSave(
        generationRequested(
          new FormData(event.currentTarget, event.nativeEvent.submitter),
          construct.definition.visual?.description ?? "",
        ),
      );
    },
    [construct],
  );
  const report = useContext(PromptDraftContext);
  // Start disabled until the editor has checked this browser's recovered draft.
  const [changed, setChanged] = useState(true);
  const [draftDescription, setDraftDescription] = useState(
    construct.definition.visual?.description ?? "",
  );
  const reportDraft = useCallback(
    (draft: PromptDraft): void => {
      report?.(draft);
      const { prompt, visualDescription = "" } = draft.texts;
      setDraftDescription(visualDescription);
      setChanged(
        draft.name !== construct.name ||
          prompt !== construct.definition.prompt ||
          visualDescription !==
            (construct.definition.visual?.description ?? ""),
      );
    },
    [report, construct],
  );
  let saveLabel: string = PROMPT_COPY.save;
  let saveHint: string = VISUAL_COPY.saveWithoutGeneration;
  const descriptionChanged =
    normalizeVisualDescription(draftDescription) !==
    normalizeVisualDescription(construct.definition.visual?.description ?? "");
  if (
    descriptionChanged &&
    normalizeVisualDescription(draftDescription) !== ""
  ) {
    saveLabel = VISUAL_COPY.saveAndGenerate;
    saveHint = VISUAL_COPY.saveConsequence;
    if (quote === undefined) {
      saveHint += ` ${VISUAL_COPY.reservationUnknown}`;
    } else {
      saveHint += ` ${VISUAL_COPY.reservation(quote.reservationGold)}`;
    }
  }
  return (
    <>
      <PromptDraftContext value={reportDraft}>
        <PromptEditor
          {...editor}
          action={save}
          onSubmitCapture={captureSubmission}
          saveLabel={saveLabel}
          saveHint={saveHint}
          formId={formId}
          saving={saving}
          disabled={generationBlocked && descriptionChanged}
        />
      </PromptDraftContext>
      <ConstructVisualGeneration
        construct={construct}
        viewer={viewer}
        onBlockedChange={setGenerationBlocked}
        onQuoteChange={setQuote}
        changed={changed}
        draftDescription={draftDescription}
        formId={formId}
        saving={saving}
        generating={saving && generatingSave}
      />
    </>
  );
}

export { ConstructEditor };
