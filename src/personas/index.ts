import { egonSpengler } from "@/personas/egon-spengler.ts";
import { fordPines } from "@/personas/ford-pines.ts";
import { hippy } from "@/personas/hippy.ts";
import { mrT } from "@/personas/mr-t.ts";
import {
  PERSONA_IDS,
  type Persona,
  type PersonaId,
} from "@/personas/persona.ts";
import { rolandDeschain } from "@/personas/roland-deschain.ts";
import { stanPines } from "@/personas/stan-pines.ts";

const PERSONA_ID_SET: ReadonlySet<string> = new Set<string>(PERSONA_IDS);

const personasById: Readonly<Record<PersonaId, Persona>> = {
  hippy,
  "mr-t": mrT,
  "ford-pines": fordPines,
  "stan-pines": stanPines,
  "egon-spengler": egonSpengler,
  "roland-deschain": rolandDeschain,
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
