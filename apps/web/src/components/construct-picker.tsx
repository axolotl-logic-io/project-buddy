"use client";


import { type JSX, useCallback, useState } from "react";
import { ConstructIllustration } from "@/components/constructs/construct-visual.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import type { ConstructSnapshot } from "@/constructs/construct.ts";
import type { OwnConstructChoice } from "@/constructs/construct-store.ts";
import {
  type ConstructId,
  DEFAULT_CONSTRUCT_ID,
  listConstructs,
} from "@/constructs/index.ts";
import type { OwnPromptId } from "@/ids.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { constructPersonality } from "@/ui/copy/construct-discovery.ts";

// A construct as the picker shows it.
interface ConstructChoice extends ConstructSnapshot {
  readonly id: ConstructId | OwnPromptId;
  readonly name: string;
  readonly description: string;
}

const BUILT_IN_CHOICES: readonly ConstructChoice[] = listConstructs().map(
  ({ id, name, description, definition }) => ({
    id,
    name,
    description,
    definition,
  }),
);

const NO_USER_CONSTRUCTS: readonly OwnConstructChoice[] = [];

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
    ...userConstructs.map(({ id, name, visual }) => ({
      id,
      name,
      description: NEW_CHAT_COPY.ownConstructDescription,
      definition: { prompt: "", visual },
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
          <div aria-live="polite" className="construct-discovery-card">
            <div className="construct-discovery-art">
              <ConstructIllustration
                construct={chosen}
                visualRole="portrait"
                decorative={true}
              />
            </div>
            <div className="construct-discovery-copy">
              <span className="font-heading font-medium">{chosen.name}</span>
              <span className="text-muted text-xs tabular-nums">
                {NEW_CHAT_COPY.constructPosition(index + 1, count)}
              </span>
              <p className="text-sm">{chosen.description}</p>
              <p>{constructPersonality(chosen).temperament}</p>
              <blockquote className="text-muted">
                {constructPersonality(chosen).sample}
              </blockquote>
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
