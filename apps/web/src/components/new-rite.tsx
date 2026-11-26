import Link from "next/link";
import type { JSX } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";

// New rite, at the end of the Grimoire's trail band. On a narrow phone it
// keeps its plus and drops its words from view.
function NewRite(): JSX.Element {
  return (
    <div className="new-quest-trail-tools">
      <Button asChild={true}>
        <Link href="/grimoire/new">
          <Icon name="plus" />
          <span className="new-quest-label">{GRIMOIRE_COPY.create}</span>
        </Link>
      </Button>
    </div>
  );
}

export { NewRite };
