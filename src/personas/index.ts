import { argonSprangler } from "@/personas/argon-sprangler.ts";
import { fjordTines } from "@/personas/fjord-tines.ts";
import { hippy } from "@/personas/hippy.ts";
import { mrTee } from "@/personas/mr-tee.ts";
import {
  PERSONA_IDS,
  type Persona,
  type PersonaId,
} from "@/personas/persona.ts";
import { rolandDustchain } from "@/personas/roland-dustchain.ts";
import { spanTines } from "@/personas/span-tines.ts";

const PERSONA_ID_SET: ReadonlySet<string> = new Set<string>(PERSONA_IDS);

const personasById: Readonly<Record<PersonaId, Persona>> = {
  hippy,
  "mr-tee": mrTee,
  "fjord-tines": fjordTines,
  "span-tines": spanTines,
  "argon-sprangler": argonSprangler,
  "roland-dustchain": rolandDustchain,
};

export type { Persona, PersonaId } from "@/personas/persona.ts";

export const DEFAULT_PERSONA_ID: PersonaId = "hippy";

export function isPersonaId(id: string): id is PersonaId {
  return PERSONA_ID_SET.has(id);
}

export function listPersonas(): Persona[] {
  return PERSONA_IDS.map((id) => personasById[id]);
}

export function getPersona(id: PersonaId): Persona {
  return personasById[id];
}

// The system-prompt fragment that sets the tutor's voice for a chat.
export function renderPersonaPrompt(persona: Persona): string {
  return [
    `# Persona: ${persona.name}`,
    `Write as ${persona.name}. ${persona.voice}`,
    "## Sample lines",
    "These show the tone only. Write new lines in this style; do not repeat them word for word.",
    persona.sampleLines.map((line) => `- ${line}`).join("\n"),
    "## Rules",
    persona.rules.map((rule) => `- ${rule}`).join("\n"),
  ].join("\n\n");
}
