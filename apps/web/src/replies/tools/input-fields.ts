// The buddy's tools as the buddy page shows them: each tool's input
// fields with the descriptions Claude reads, which no buddy can change.
// The descriptions are read from the tools' input schemas, so they are
// always the ones the tools send.
import type { z } from "zod";
import {
  CITE_MANUAL_INPUT,
  CITE_MANUAL_TOOL,
} from "@/replies/tools/cite-manual-contract.ts";
import {
  CREATE_PROJECT_INPUT,
  CREATE_PROJECT_TOOL,
} from "@/replies/tools/create-project-contract.ts";
import {
  SEARCH_MANUAL_INPUT,
  SEARCH_MANUAL_TOOL,
} from "@/replies/tools/search-manual-contract.ts";
import {
  UPDATE_MEMORY_INPUT,
  UPDATE_MEMORY_TOOL,
} from "@/replies/tools/update-memory-contract.ts";

// One input field of a tool: its name and its description.
interface ToolInputField {
  readonly name: string;
  readonly description: string;
}

// A tool, by name, and its input fields in the schema's order.
interface ToolInputFields {
  readonly tool: string;
  readonly fields: readonly ToolInputField[];
}

function fieldsOf(input: z.ZodObject): ToolInputField[] {
  return Object.entries(input.shape).map(([name, field]) => ({
    name,
    description: field.description ?? "",
  }));
}

// Each tool the buddy has, and its input fields.
const TOOL_INPUT_FIELDS: readonly ToolInputFields[] = [
  { tool: SEARCH_MANUAL_TOOL, fields: fieldsOf(SEARCH_MANUAL_INPUT) },
  { tool: CITE_MANUAL_TOOL, fields: fieldsOf(CITE_MANUAL_INPUT) },
  { tool: UPDATE_MEMORY_TOOL, fields: fieldsOf(UPDATE_MEMORY_INPUT) },
  { tool: CREATE_PROJECT_TOOL, fields: fieldsOf(CREATE_PROJECT_INPUT) },
];

export type { ToolInputField, ToolInputFields };
export { TOOL_INPUT_FIELDS };
