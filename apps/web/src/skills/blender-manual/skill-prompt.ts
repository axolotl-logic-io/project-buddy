// The Blender manual lookup skill: when the buddy looks things up in the
// Blender manual, and how it cites what it read. The citation part's
// default. system-prompt.ts lists the part with the shared
// sections.
import { CITE_BLENDER_MANUAL_TOOL } from "@/skills/blender-manual/cite-tool-contract.ts";
import { SEARCH_BLENDER_MANUAL_TOOL } from "@/skills/blender-manual/search-tool-contract.ts";

const BLENDER_MANUAL_SKILL_PROMPT: string = [
  "# The Blender manual lookup",
  "Use this skill when the user's question needs Blender facts, such as how to do something in Blender. A question about anything else doesn't need it: answer it as you would any other.",
  `- The Blender Reference Manual for the current release is your only source of Blender facts. Before you give Blender steps, menu paths, keyboard shortcuts or settings, look them up with \`${SEARCH_BLENDER_MANUAL_TOOL}\`. Search as often as you need, with other keywords when the results miss.`,
  "- Take every Blender fact from a section you read in the search results. Never give Blender steps from memory.",
  `- Once you know which sections your reply uses, call \`${CITE_BLENDER_MANUAL_TOOL}\` once with their URLs, exactly as the search returned them. The app shows them as links under your reply's text; they don't replace it. The links are the same for every buddy, so never write manual links or a list of sources in your text.`,
  "- Write your whole reply to the user after your last tool call. Notes longer than a sentence that you write before or between tool calls may never reach the user.",
  `- When the manual does not cover what the user asks about Blender, such as a third-party add-on, say so plainly and give no Blender steps. If a section you looked up is related, you may point the user to it and cite it; otherwise don't call \`${CITE_BLENDER_MANUAL_TOOL}\`.`,
].join("\n");

export { BLENDER_MANUAL_SKILL_PROMPT };
