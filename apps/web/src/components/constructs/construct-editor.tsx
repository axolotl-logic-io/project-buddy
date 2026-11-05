"use client";

import {
  type ComponentProps,
  type JSX,
  useCallback,
  useContext,
  useState,
} from "react";
import { ConstructVisualGeneration } from "@/components/constructs/construct-visual-generation.tsx";
import {
  type PromptDraft,
  PromptDraftContext,
} from "@/components/prompt-draft-context.ts";
import { PromptEditor } from "@/components/prompt-editor.tsx";
import type { OwnConstruct } from "@/constructs/construct-store.ts";

function ConstructEditor({
  construct,
  ...editor
}: ComponentProps<typeof PromptEditor> & {
  readonly construct: OwnConstruct;
}): JSX.Element {
  const report = useContext(PromptDraftContext);
  // Start disabled until the editor has checked this browser's recovered draft.
  const [changed, setChanged] = useState(true);
  const reportDraft = useCallback(
    (draft: PromptDraft): void => {
      report?.(draft);
      const { prompt, visualDescription } = draft.texts;
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
        <PromptEditor {...editor} />
      </PromptDraftContext>
      <ConstructVisualGeneration
        construct={construct}
        viewer={editor.viewer}
        changed={changed}
      />
    </>
  );
}

export { ConstructEditor };
