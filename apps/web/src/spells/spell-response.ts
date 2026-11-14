import type { SpellSnapshot } from "@/spells/spell-definition.ts";
import { spellDestinationLabel } from "@/spells/spell-destination.ts";

const PLACEHOLDER = /\{\{(?<field>spell|bucket|message|name)\}\}/gu;

// Expand the spell's response once. Placeholders in inserted values stay literal.
function spellResponse(
  templates: string | readonly string[],
  spell: SpellSnapshot,
  message: string,
  options: {
    readonly userName?: string | undefined;
    readonly random?: () => number;
  } = {},
): string {
  const { userName, random = Math.random } = options;
  let template: string;
  if (typeof templates === "string") {
    template = templates;
  } else {
    template =
      templates[Math.floor(random() * templates.length)] ?? templates[0] ?? "";
  }
  const bucket = spellDestinationLabel(spell.definition.destination);
  return template.replace(
    PLACEHOLDER,
    (_match: string, field: string): string => {
      switch (field) {
        case "spell":
          return spell.name;
        case "bucket":
          return bucket;
        case "message":
          return message;
        case "name":
          return userName ?? "the user";
        default:
          return _match;
      }
    },
  );
}

export { spellResponse };
