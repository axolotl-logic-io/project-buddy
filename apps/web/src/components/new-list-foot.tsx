"use client";

import { type JSX, type ReactNode, useContext } from "react";
import { NewListBackContext } from "@/components/new-list-back-context.ts";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { QUEST_OVERVIEW_COPY } from "@/ui/copy/quest-overview.ts";

// The foot of a New list step: Back first, when the step has one, then the
// step's own actions at the end.
function NewListFoot({
  children,
}: {
  readonly children?: ReactNode;
}): JSX.Element {
  const back = useContext(NewListBackContext);
  return (
    <div className="new-list-foot">
      {back !== undefined && (
        <Button variant="quiet" className="new-list-back" onClick={back}>
          <Icon name="chevron-left" />
          {QUEST_OVERVIEW_COPY.newList.back}
        </Button>
      )}
      {children}
    </div>
  );
}

export { NewListFoot };
