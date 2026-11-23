import Link from "next/link";
import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";

function EditorLoading({ label }: { readonly label: string }): JSX.Element {
  return (
    <div className="definition-editor">
      <header className="flex flex-col gap-2">
        <Link className="text-link" href="/grimoire">
          {GRIMOIRE_COPY.heading}
        </Link>
      </header>
      <div className="page-slot">
        <LoadingSkeleton label={label} shapes={["panel"]} />
      </div>
    </div>
  );
}

export { EditorLoading };
