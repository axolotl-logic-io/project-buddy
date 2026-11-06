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

const LINE_BREAK = /\r\n?/gu;

function ConstructEditor({
  construct,
  ...editor
}: ComponentProps<typeof PromptEditor> & {
  readonly construct: OwnConstruct;
}): JSX.Element {
  const { action, viewer } = editor;
  const formId = useId();
  const [generationBlocked, setGenerationBlocked] = useState(false);
  const [, save, saving] = useActionState(
    async (_previous: null, form: FormData): Promise<null> => {
      const description = form.get("visualDescription");
      if (typeof description === "string" && description.trim() !== "") {
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
  return (
    <>
      <PromptDraftContext value={reportDraft}>
        <PromptEditor
          {...editor}
          action={save}
          formId={formId}
          saving={saving}
          disabled={generationBlocked}
        />
      </PromptDraftContext>
      <ConstructVisualGeneration
        construct={construct}
        viewer={viewer}
        onBlockedChange={setGenerationBlocked}
        changed={changed}
        draftDescription={draftDescription}
        formId={formId}
        saving={saving}
      />
    </>
  );
}

export { ConstructEditor };
