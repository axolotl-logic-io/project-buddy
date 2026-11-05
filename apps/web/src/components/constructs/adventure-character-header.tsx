"use client";

import { Dialog } from "radix-ui";
import type { JSX } from "react";
import {
  ConstructAvatar,
  ConstructIllustration,
} from "@/components/constructs/construct-visual.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { ConstructSnapshot } from "@/constructs/construct.ts";
import type { VisualDestination } from "@/constructs/visual.ts";
import {
  CONSTRUCT_DISCOVERY_COPY,
  constructPersonality,
} from "@/ui/copy/construct-discovery.ts";

interface AdventureCharacterHeaderProps {
  /** The adventure's saved identity, including its visual metadata. */
  readonly construct: ConstructSnapshot;
  readonly destination?: VisualDestination | undefined;
}

function AdventureCharacterHeader({
  construct,
  destination,
}: AdventureCharacterHeaderProps): JSX.Element {
  const personality = constructPersonality(construct);
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild={true}>
        <button
          aria-label={CONSTRUCT_DISCOVERY_COPY.openProfile(construct.name)}
          className="character-header-control"
          type="button"
        >
          <ConstructAvatar
            destination={destination}
            construct={construct}
            decorative={true}
            size={32}
          />
          <span>{construct.name}</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className="dialog-panel character-profile"
        >
          <div className="flex min-w-0 items-start justify-between gap-3">
            <Dialog.Title className="section-heading wrap-anywhere min-w-0">
              {construct.name}
            </Dialog.Title>
            <Dialog.Close asChild={true}>
              <Button
                aria-label={CONSTRUCT_DISCOVERY_COPY.closeProfile}
                variant="secondary"
              >
                <Icon name="close" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="character-profile-art">
            <ConstructIllustration
              destination={destination}
              construct={construct}
              decorative={true}
              visualRole="portrait"
            />
          </div>
          <h3 className="font-heading font-medium">
            {CONSTRUCT_DISCOVERY_COPY.temperament}
          </h3>
          <p>{personality.temperament}</p>
          <h3 className="font-heading font-medium">
            {CONSTRUCT_DISCOVERY_COPY.approach}
          </h3>
          <p>{personality.approach}</p>
          <blockquote className="text-muted">{personality.sample}</blockquote>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { AdventureCharacterHeader };
