import type { JSX, ReactNode } from "react";
import type { PromptKind } from "@/prompts/prompt.ts";
import { WORKSHOP_COPY } from "@/ui/copy/workshop.ts";

function Workshop({
  children,
}: {
  readonly children: ReactNode;
  readonly kind: PromptKind;
}): JSX.Element {
  return (
    <section className="workshop" aria-label={WORKSHOP_COPY.heading}>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}

export { Workshop };
