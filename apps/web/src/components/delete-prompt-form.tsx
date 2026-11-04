"use client";

import Link from "next/link";
import { type JSX, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button.tsx";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { ListingId } from "@/ids.ts";
import type { PromptKind } from "@/prompts/prompt.ts";
import { DELETE_PROMPT_COPY, type MarketplaceTie } from "@/ui/copy/prompts.ts";

// A link to the listing published from the prompt, for unlisting it, or
// nothing if it isn't listed.
function UnlistLink({
  listing,
}: {
  readonly listing: ListingId | undefined;
}): JSX.Element | null {
  if (listing === undefined) {
    return null;
  }
  return (
    <Link className="self-start text-link" href={`/marketplace/${listing}`}>
      {DELETE_PROMPT_COPY.unlistLink}
    </Link>
  );
}

function tieOf(
  bought: boolean,
  listing: ListingId | undefined,
): MarketplaceTie {
  if (bought) {
    return "bought";
  }
  if (listing !== undefined) {
    return "listed";
  }
  return "none";
}

// Deletes one of the user's own buddies, activities or spells once they
// confirm. The dialog says what deleting it changes: for one bought in the
// Marketplace, that no gold comes back; for one listed there now (listing),
// that the listing stays up, with a link to it for unlisting. action
// receives the prompt's id as `promptId`.
export function DeletePromptForm({
  action,
  kind,
  promptId,
  name,
  bought,
  listing,
}: {
  readonly action: (formData: FormData) => Promise<never>;
  readonly kind: PromptKind;
  readonly promptId: string;
  readonly name: string;
  readonly bought: boolean;
  readonly listing: ListingId | undefined;
}): JSX.Element {
  const formRef = useRef<HTMLFormElement>(null);
  const confirm = useCallback((): void => {
    formRef.current?.requestSubmit();
  }, []);
  return (
    <form action={action} ref={formRef}>
      <input name="promptId" type="hidden" value={promptId} />
      <ConfirmDialog
        cancelLabel={DELETE_PROMPT_COPY.cancel}
        confirmLabel={DELETE_PROMPT_COPY.confirm(kind)}
        description={DELETE_PROMPT_COPY.description(
          kind,
          name,
          tieOf(bought, listing),
        )}
        onConfirm={confirm}
        title={DELETE_PROMPT_COPY.title(kind)}
        trigger={
          <Button
            aria-label={DELETE_PROMPT_COPY.deleteLabel(name)}
            variant="quiet"
          >
            <Icon name="trash" />
            {DELETE_PROMPT_COPY.delete}
          </Button>
        }
      >
        <UnlistLink listing={listing} />
      </ConfirmDialog>
    </form>
  );
}
