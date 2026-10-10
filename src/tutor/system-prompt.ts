import { type Persona, renderPersonaPrompt } from "@/personas";

export type TutorSystemPromptInput = {
  projectName: string;
  persona: Persona;
};

// The system prompt for every chat turn: the tutor role, then the persona.
// Project memory joins as another section once it exists.
export function buildTutorSystemPrompt({
  projectName,
  persona,
}: TutorSystemPromptInput): string {
  return [
    `You are a Blender tutor. You teach Autumn Blender through Autumn's own project, "${projectName}".`,
    renderPersonaPrompt(persona),
  ].join("\n\n");
}
