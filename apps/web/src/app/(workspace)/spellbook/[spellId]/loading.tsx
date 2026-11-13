import type { JSX } from "react";
import { EditorLoading } from "@/components/ui/editor-loading.tsx";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";

export default function SpellLoading(): JSX.Element {
  return <EditorLoading label={SPELLBOOK_COPY.loading} />;
}
