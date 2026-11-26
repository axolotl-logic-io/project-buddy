import type { JSX } from "react";
import { Icon } from "@/components/ui/icon.tsx";
import type { Rite } from "@/rites/rite.ts";
import { GRIMOIRE_COPY } from "@/ui/copy/grimoire.ts";

// A placeholder, kept whole when a template is split around it.
const PLACEHOLDER = /(?<placeholder>\{(?:rite|list|text|user)\})/u;

const PLACEHOLDERS = ["rite", "list", "text", "user"] as const;

// A rite's template with each placeholder set as a token, so it stands
// apart from the words around it.
function RiteText({ text }: { readonly text: string }): JSX.Element {
  const parts: JSX.Element[] = [];
  let at = 0;
  for (const part of text.split(PLACEHOLDER)) {
    if (PLACEHOLDER.test(part)) {
      parts.push(
        <span className="rite-placeholder" key={at}>
          {part}
        </span>,
      );
    } else if (part !== "") {
      parts.push(<span key={at}>{part}</span>);
    }
    at += part.length;
  }
  return <>{parts}</>;
}

// A rite's seal: a book for a built-in rite, or the initial of the user's
// own.
function RiteSeal({
  rite,
}: {
  readonly rite: Pick<Rite, "name" | "source">;
}): JSX.Element {
  let mark: JSX.Element | string = Array.from(rite.name)[0] ?? "";
  if (rite.source === "built-in") {
    mark = <Icon name="book" />;
  }
  return (
    <span aria-hidden="true" className="quest-seal">
      {mark}
    </span>
  );
}

// What each placeholder stands for in a performance.
function PlaceholderLegend(): JSX.Element {
  return (
    <section aria-label={GRIMOIRE_COPY.placeholders} className="rite-legend">
      <p className="quests-label">{GRIMOIRE_COPY.placeholders}</p>
      <dl>
        {PLACEHOLDERS.map((key) => (
          <div key={key}>
            <dt>
              <span className="rite-placeholder">{`{${key}}`}</span>
            </dt>
            <dd>{GRIMOIRE_COPY.placeholderMeanings[key]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export { PlaceholderLegend, RiteSeal, RiteText };
