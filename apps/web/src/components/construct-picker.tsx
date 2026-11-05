"use client";

import { type JSX, useCallback, useState } from "react";
import { Icon } from "@/components/ui/icon.tsx";
import type { OwnConstructChoice } from "@/constructs/construct-store.ts";
import {
  type ConstructId,
  DEFAULT_CONSTRUCT_ID,
  listConstructs,
} from "@/constructs/index.ts";
import type { OwnPromptId } from "@/ids.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";

// A construct as the picker shows it.
interface ConstructChoice {
  readonly id: ConstructId | OwnPromptId;
  readonly name: string;
  readonly description: string;
  readonly own: boolean;
}

const BUILT_IN_CHOICES: readonly ConstructChoice[] = listConstructs().map(
  ({ id, name, description }) => ({ id, name, description, own: false }),
);

const NO_USER_CONSTRUCTS: readonly OwnConstructChoice[] = [];

// The words of a name, for its monogram.
const NAME_WORD = /\p{L}+/gu;

// The first letters of a name's first two words, such as "PN" for Professor Notebook.
function monogram(name: string): string {
  return Array.from(name.matchAll(NAME_WORD), ([word]) => word.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// A construct's initials in a circle, in the accent colour for one of the
// user's own.
function ConstructMonogram({
  choice,
}: {
  readonly choice: ConstructChoice;
}): JSX.Element {
  let className = "construct-monogram";
  if (choice.own === true) {
    className += " construct-monogram-own";
  }
  return (
    <span aria-hidden={true} className={className}>
      {monogram(choice.name)}
    </span>
  );
}

// A form's choice of construct, sent as `constructId`: the built-in constructs,
// then any of the user's own given, with defaultConstructId, or else the
// default construct, chosen to start with. It shows the chosen construct's card,
// between buttons to the previous and next construct, which wrap round at
// either end.
function ConstructPicker({
  defaultConstructId = DEFAULT_CONSTRUCT_ID,
  userConstructs = NO_USER_CONSTRUCTS,
  label = NEW_CHAT_COPY.constructLabel,
}: {
  readonly defaultConstructId?: ConstructId | OwnPromptId;
  readonly userConstructs?: readonly OwnConstructChoice[];
  readonly label?: string;
}): JSX.Element {
  const choices: readonly ConstructChoice[] = [
    ...BUILT_IN_CHOICES,
    ...userConstructs.map(({ id, name }) => ({
      id,
      name,
      description: NEW_CHAT_COPY.ownConstructDescription,
      own: true,
    })),
  ];
  const count = choices.length;
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      choices.findIndex(({ id }) => id === defaultConstructId),
    ),
  );
  const previous = useCallback((): void => {
    setIndex((shown) => (shown - 1 + count) % count);
  }, [count]);
  const next = useCallback((): void => {
    setIndex((shown) => (shown + 1) % count);
  }, [count]);
  const chosen = choices[index] ?? BUILT_IN_CHOICES[0];
  if (chosen === undefined) {
    throw new Error("The construct picker has no constructs");
  }

  return (
    <div className="field">
      <p className="field-label">{label}</p>
      <div className="construct-picker">
        <div className="construct-picker-face">
          <button
            aria-label={NEW_CHAT_COPY.previousConstruct}
            className="construct-picker-bar border-line border-r"
            onClick={previous}
            type="button"
          >
            <Icon name="chevron-left" />
          </button>
          <div aria-live="polite" className="construct-picker-card">
            <ConstructMonogram choice={chosen} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-heading font-medium">
                {chosen.name}
              </span>
              <span className="text-muted text-xs tabular-nums">
                {NEW_CHAT_COPY.constructPosition(index + 1, count)}
              </span>
              <p className="construct-picker-description">
                {chosen.description}
              </p>
            </div>
          </div>
          <button
            aria-label={NEW_CHAT_COPY.nextConstruct}
            className="construct-picker-bar border-line border-l"
            onClick={next}
            type="button"
          >
            <Icon name="chevron-right" />
          </button>
        </div>
      </div>
      <input name="constructId" type="hidden" value={chosen.id} />
    </div>
  );
}

export { ConstructPicker };
