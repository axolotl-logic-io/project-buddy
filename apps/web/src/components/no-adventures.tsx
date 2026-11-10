import type { JSX, ReactNode } from "react";
import { ConstructIllustration } from "@/components/constructs/construct-visual.tsx";
import { DEFAULT_CONSTRUCT_ID, getConstruct } from "@/constructs/index.ts";
import { STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";

// The Adventures page before the user's first adventure: the default
// construct's portrait, a word on what an adventure is, and action, the New
// adventure button, in place of the list and its filters.
function NoAdventures({ action }: { readonly action: ReactNode }): JSX.Element {
  return (
    <div className="no-adventures">
      <div className="no-adventures-art">
        <ConstructIllustration
          construct={getConstruct(DEFAULT_CONSTRUCT_ID)}
          visualRole="portrait"
          displayWidth={132}
          decorative={true}
        />
      </div>
      <h2 className="section-heading">{STANDALONE_CHATS_COPY.emptyHeading}</h2>
      <p className="max-w-prose text-muted text-sm">
        {STANDALONE_CHATS_COPY.emptyIntro}
      </p>
      {action}
    </div>
  );
}

export { NoAdventures };
