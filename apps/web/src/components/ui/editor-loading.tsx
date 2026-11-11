import Link from "next/link";
import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { WORKSHOP_COPY } from "@/ui/copy/workshop.ts";

function EditorLoading({ label }: { readonly label: string }): JSX.Element {
  return (
    <div className="workshop">
      <header className="flex flex-col gap-2">
        <Link className="text-link" href="/workshop">
          {WORKSHOP_COPY.heading}
        </Link>
        <p className="text-muted">{WORKSHOP_COPY.intro}</p>
      </header>
      <div className="page-slot">
        <p className="font-medium text-muted text-sm">{WORKSHOP_COPY.edit}</p>
        <LoadingSkeleton label={label} shapes={["panel"]} />
      </div>
    </div>
  );
}

export { EditorLoading };
