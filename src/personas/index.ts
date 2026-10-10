import { egonSpengler } from "@/personas/egon-spengler.ts";
import { fordPines } from "@/personas/ford-pines.ts";
import { hippy } from "@/personas/hippy.ts";
import { mrT } from "@/personas/mr-t.ts";
import {
  DEFAULT_PERSONA_ID,
  PERSONA_IDS,
  PERSONA_SHARED_RULES,
  type Persona,
  type PersonaId,
} from "@/personas/persona.ts";
import { rolandDeschain } from "@/personas/roland-deschain.ts";
import { stanPines } from "@/personas/stan-pines.ts";

export {
  DEFAULT_PERSONA_ID,
  PERSONA_IDS,
  PERSONA_SHARED_RULES,
  type Persona,
  type PersonaId,
};

const personasById: Record<PersonaId, Persona> = {
  hippy,
  "mr-t": mrT,
  "ford-pines": fordPines,
  "stan-pines": stanPines,
  "egon-spengler": egonSpengler,
  "roland-deschain": rolandDeschain,
};

export function isPersonaId(id: string): id is PersonaId {
  return (PERSONA_IDS as readonly string[]).includes(id);
}

export function listPersonas(): Persona[] {
  return PERSONA_IDS.map((id) => personasById[id]);
}

// Chats store the persona id as text, so lookups accept any string.
export function getPersona(id: string): Persona | undefined {
  return isPersonaId(id) ? personasById[id] : undefined;
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
