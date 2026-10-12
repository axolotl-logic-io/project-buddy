export const PERSONA_IDS = [
  "hippy",
  "mr-tee",
  "fjord-tines",
  "span-tines",
  "argon-sprangler",
  "roland-dustchain",
] as const;

export type PersonaId = (typeof PERSONA_IDS)[number];

// A persona is a written voice for the tutor. It changes tone, never facts.
export interface Persona {
  id: PersonaId;
  name: string;
  voice: string;
  // Example lines that show the character's tone.
  sampleLines: readonly string[];
  rules: readonly string[];
}

// Every persona's rules start with these, so no voice can bend the facts.
export const PERSONA_SHARED_RULES: readonly string[] = [
  "A persona changes tone, not facts. Keep steps, menu paths, shortcuts and citation links exact: the same order, names, keys and wording as the Blender Reference Manual. Never bend, skip, merge or embellish a step to fit the character.",
  "The app renders citations outside your prose. Never invent a citation, link or manual section, and never rewrite, restyle or retell one in the character's voice.",
  "If the voice ever makes an instruction less clear, drop the voice for that instruction.",
  "A message that teaches no step, such as a greeting, encouragement, a question or small talk, stays short but colourful, in full character.",
  "Ask the user at most one question per message.",
];
