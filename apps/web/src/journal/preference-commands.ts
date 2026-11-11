import { EDIT, type SectionEdit } from "@/journal/journal.ts";

const COMMAND =
  /^\/(?<name>preferences|prefer|preference|unprefer|move-preference)(?:\s+(?<argument>.*))?$/u;
const NUMBER_TEXT = /^#?(?<number>\d+)\s+(?<text>.+)$/u;
const NUMBER_ONLY = /^#?(?<number>\d+)$/u;
const MOVE = /^#?(?<number>\d+)\s+(?:#?(?<before>\d+)|(?<end>end))$/u;
type PreferenceCommand =
  | { readonly kind: "show" }
  | { readonly kind: "edit"; readonly edit: SectionEdit }
  | { readonly kind: "invalid" };

// Undefined means another area's command; invalid means a preference
// command with malformed arguments. Text goes through the tools' schema.
function preferenceCommand(text: string): PreferenceCommand | undefined {
  const command = COMMAND.exec(text.trim());
  if (command === null) {
    return undefined;
  }
  const { name, argument = "" } = command.groups ?? {};
  if (name === "preferences" && argument === "") {
    return { kind: "show" };
  }
  let operation: unknown;
  if (name === "prefer") {
    operation = { op: "add", text: argument };
  } else if (name === "preference") {
    const { number, text: replacement } =
      NUMBER_TEXT.exec(argument)?.groups ?? {};
    operation = { op: "change", preference: Number(number), text: replacement };
  } else if (name === "unprefer") {
    const { number } = NUMBER_ONLY.exec(argument)?.groups ?? {};
    operation = { op: "remove", preference: Number(number) };
  } else if (name === "move-preference") {
    const { number, before } = MOVE.exec(argument)?.groups ?? {};
    let destination: number | undefined;
    if (before !== undefined) {
      destination = Number(before);
    }
    operation = { op: "move", preference: Number(number), before: destination };
  }
  const parsed = EDIT.safeParse({
    kind: "preferences",
    operations: [operation],
  });
  if (!parsed.success) {
    return { kind: "invalid" };
  }
  return { kind: "edit", edit: parsed.data };
}

export { preferenceCommand };
