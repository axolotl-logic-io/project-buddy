import Link from "next/link";
import type { JSX } from "react";
import { Button } from "@/components/ui/button.tsx";
import { SavedChoices } from "@/components/ui/saved-choices.tsx";
import { PROBLEMS_COPY } from "@/ui/copy/problems.ts";

// What a page that isn't found shows: the message saying what can't be
// found and a way back to the quests. A page that isn't found while
// rendering arrives without <head>'s pre-paint scripts, so SavedChoices
// applies the saved mode.
function PageNotFound({ message }: { readonly message: string }): JSX.Element {
  return (
    <div className="panel flex flex-col items-start gap-4">
      <SavedChoices />
      <h1 className="page-heading">{PROBLEMS_COPY.notFoundHeading}</h1>
      <p>{message}</p>
      <Button asChild={true} variant="secondary">
        <Link href="/quests">{PROBLEMS_COPY.questsLink}</Link>
      </Button>
    </div>
  );
}

export { PageNotFound };
