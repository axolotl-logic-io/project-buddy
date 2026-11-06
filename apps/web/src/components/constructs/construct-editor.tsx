"use client";

import {
  type ComponentProps,
  type JSX,
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

import type { VisualGenerationQuote } from "@/constructs/visual-generation-contract.ts";
import { VISUAL_COPY } from "@/ui/copy/construct-visuals.ts";
import { PROMPT_COPY } from "@/ui/copy/prompts.ts";

const LINE_BREAK = /\r\n?/gu;

function ConstructEditor({
  construct,
  ...editor
}: ComponentProps<typeof PromptEditor> & {
  readonly construct: OwnConstruct;
}): JSX.Element {
  const { action, viewer } = editor;
  const formId = useId();
  const [quote, setQuote] = useState<VisualGenerationQuote>();
  const [generationBlocked, setGenerationBlocked] = useState(false);
  const [, save, saving] = useActionState(
    async (_previous: null, form: FormData): Promise<null> => {
      const description = form.get("visualDescription");
      if (
        quote?.available !== false &&
        typeof description === "string" &&
        description.trim() !== ""
      ) {
        const request = {
          constructId: construct.id,
          requestId: crypto.randomUUID(),
          description: description.trim().replace(LINE_BREAK, "\n"),
        };
        keepLocalDraft(`visual:${viewer}:${construct.id}`, request);
        form.set("visualRequestId", request.requestId);
      }
      await action(form);
      return null;
    },
    null,
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
  let saveHint: string | undefined;
  if (draftDescription.trim() !== "") {
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
          saveLabel={saveLabel}
          saveHint={saveHint}
          formId={formId}
          saving={saving}
          disabled={generationBlocked}
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
      />
    </>
  );
}

export { ConstructEditor };
