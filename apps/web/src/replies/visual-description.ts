import { z } from "zod";
import type { ReplyPromptContext } from "@/replies/system-prompt.ts";

const START = "<construct_visual_description>";
const END = "\n</construct_visual_description>";

// The local look command reads the conversation's saved construct snapshot.
function visualDescriptionSection({ construct }: ReplyPromptContext): string {
  const description = construct.definition.visual?.description ?? "";
  return `${START}\n${JSON.stringify(description)}\n${END}`;
}

// Decode data without interpreting descriptions as commands.
function visualDescriptionInPrompt(prompt: string): string {
  const start = prompt.indexOf(START);
  const end = prompt.indexOf(END, start);
  if (start === -1 || end === -1) {
    return "";
  }
  try {
    const value: unknown = JSON.parse(
      prompt.slice(start + START.length, end).trim(),
    );
    return z.string().safeParse(value).data ?? "";
  } catch {
    return "";
  }
}

export { visualDescriptionInPrompt, visualDescriptionSection };
