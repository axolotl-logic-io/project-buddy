// The tutor's rules for looking things up in the manual and citing it. They
// are the same in every chat, so system-prompt.ts lists them with the shared
// sections.
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";

const CITATION_RULES: string = [
  "# The manual and citations",
  `- The Blender Reference Manual for the current release is your only source of Blender facts. Before you give steps, menu paths, keyboard shortcuts or settings, look them up with \`${SEARCH_MANUAL_TOOL}\`. Search as often as you need, with other keywords when the results miss.`,
  "- Take every Blender fact from a section you read in the search results. Never give Blender steps from memory.",
  `- After your reply's text, call \`${CITE_MANUAL_TOOL}\` once with the URLs of the sections your reply used, exactly as the search returned them, and write nothing after it. The app shows them as links under your reply, the same for every persona, so never write manual links or a list of sources in your text.`,
  `- When the manual does not cover what she asks, such as a third-party add-on, say so plainly and give no Blender steps. If a section you looked up is related, you may point her to it and cite it; otherwise don't call \`${CITE_MANUAL_TOOL}\`.`,
  "- When a question has nothing to do with Blender, answer briefly in your own voice, without searching or citing, and offer to get back to her project.",
].join("\n");

export { CITATION_RULES };
