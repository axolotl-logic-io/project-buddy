import Link from "next/link";
import type { JSX, ReactNode } from "react";
import type { PromptKind } from "@/prompts/prompt.ts";
import { workshopPath } from "@/routes.ts";
import { WORKSHOP_COPY } from "@/ui/copy/workshop.ts";

// The frame around a construct's, activity's or spell's editor: a way back to
// the Workshop, what the page is for, and the editor itself.
function Workshop({
  children,
  kind,
}: {
  readonly children: ReactNode;
  readonly kind: PromptKind;
}): JSX.Element {
  return (
    <section className="workshop" aria-label={WORKSHOP_COPY.heading}>
      <header className="flex min-w-0 flex-col gap-2 border-line border-b py-3">
        <Link className="text-link" href={workshopPath(kind)}>
          {WORKSHOP_COPY.heading}
        </Link>
        <p className="text-muted">{WORKSHOP_COPY.intro}</p>
      </header>
      <div className="flex min-w-0 flex-col gap-4">
        <p className="font-medium text-muted text-sm">{WORKSHOP_COPY.edit}</p>
        {children}
      </div>
    </section>
  );
}

export { Workshop };
