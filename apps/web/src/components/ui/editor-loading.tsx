import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { WORKSHOP_COPY } from "@/ui/copy/workshop.ts";

function EditorLoading({ label }: { readonly label: string }): JSX.Element {
  return (
    <div className="workshop">
      <header className="flex flex-col gap-2">
        <span className="text-link">{WORKSHOP_COPY.heading}</span>
        <p className="text-muted">{WORKSHOP_COPY.intro}</p>
      </header>
      <div className="page-slot">
        <div className="page-slot">
          <p className="section-heading">{WORKSHOP_COPY.edit}</p>
          <LoadingSkeleton label={label} shapes={["heading", "panel"]} />
        </div>
      </div>
    </div>
  );
}

export { EditorLoading };
