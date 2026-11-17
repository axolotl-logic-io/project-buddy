import Link from "next/link";
import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";

function EditorLoading({ label }: { readonly label: string }): JSX.Element {
  return (
    <div className="definition-editor">
      <header className="flex flex-col gap-2">
        <Link className="text-link" href="/spellbook">
          {SPELLBOOK_COPY.heading}
        </Link>
      </header>
      <div className="page-slot">
        <LoadingSkeleton label={label} shapes={["panel"]} />
      </div>
    </div>
  );
}

export { EditorLoading };
