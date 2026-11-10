"use client";

import { type JSX, useCallback } from "react";
import {
  type CommandListing,
  optionId,
} from "@/components/chat/chat-commands.ts";
import { CHAT_COMMANDS_COPY } from "@/ui/copy/plan.ts";

function CommandOption({
  listing,
  id,
  active,
  onChoose,
}: {
  readonly listing: CommandListing;
  readonly id: string;
  readonly active: boolean;
  readonly onChoose: (command: string) => void;
}): JSX.Element {
  const choose = useCallback(
    (): void => onChoose(listing.command),
    [onChoose, listing.command],
  );
  return (
    <button
      type="button"
      role="option"
      id={id}
      aria-selected={active}
      tabIndex={-1}
      className="command-option"
      onClick={choose}
    >
      <code>{listing.usage}</code>
      <span className="text-muted">{listing.description}</span>
    </button>
  );
}

// The commands that match what the user has typed after "/", above the
// message box, which moves through them with the arrow keys
// (use-composer-commands.ts). Choosing one puts it in the box.
function CommandMenu({
  id,
  listings,
  active,
  onChoose,
}: {
  readonly id: string;
  readonly listings: readonly CommandListing[];
  readonly active: number;
  readonly onChoose: (command: string) => void;
}): JSX.Element {
  return (
    <div className="command-menu">
      <div
        id={id}
        role="listbox"
        aria-label={CHAT_COMMANDS_COPY.listLabel}
        className="command-list"
      >
        {listings.map((listing, index) => (
          <CommandOption
            key={listing.command}
            listing={listing}
            id={optionId(id, index)}
            active={index === active}
            onChoose={onChoose}
          />
        ))}
      </div>
      <p className="command-hint">{CHAT_COMMANDS_COPY.hint}</p>
    </div>
  );
}

export { CommandMenu };
