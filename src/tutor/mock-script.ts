// What the mock tutor model says: a script of steps for each reply, and the
// default script, which answers the `/mock-…` commands in MOCK_COMMANDS and
// quotes any other message.
import { z } from "zod";
import { manualUrl } from "@/manual/manual-source.ts";
import { mockErrorReply } from "@/tutor/mock-error.ts";
import { mockSystemPromptReply } from "@/tutor/mock-system-prompt.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import {
  SEARCH_MANUAL_OUTPUT,
  SEARCH_MANUAL_TOOL,
} from "@/tutor/tools/search-manual-contract.ts";

// A tool call the mock makes, with the input the tool's schema should accept.
interface MockToolCall {
  readonly toolName: string;
  readonly input: unknown;
}

// One model call. Usually text to stream, then tool calls: a step with tool
// calls makes the AI SDK run them and call the model again for the next
// step, and a step without them ends the reply. A step with an error streams
// its text, then fails mid-stream with the error, as a provider does.
type MockStep =
  | { readonly text: string; readonly toolCalls: readonly MockToolCall[] }
  | { readonly text: string; readonly error: unknown };

// What a tool answered: its output, or the error it failed with.
interface MockToolResult {
  readonly toolName: string;
  readonly failed: boolean;
  readonly output: unknown;
}

// What the model was sent besides the user's last message.
interface MockConversation {
  // The system prompt's texts, in order.
  readonly systemTexts: readonly string[];
  // The text of every message before the user's last one, in order.
  readonly earlierTexts: readonly string[];
  // What the tools answered since the user's last message, in call order.
  readonly toolResults: readonly MockToolResult[];
}

// The steps of one reply, chosen from the text of the user's last message
// and the conversation so far. It is called again for every step, so later
// steps may read the tool results of earlier ones.
type MockScript = (
  userText: string,
  conversation: MockConversation,
) => readonly MockStep[];

// A command to the default script: `/mock-<name> <argument>`.
interface MockCommand {
  readonly name: string;
  // How to write the command and what the mock does, in Markdown. The reply
  // to an unknown command lists every usage.
  readonly usage: string;
  readonly reply: (
    argument: string,
    conversation: MockConversation,
  ) => readonly MockStep[];
}

const MOCK_COMMAND = /^\/mock-(?<name>\S+)(?:\s+(?<argument>.*))?$/su;

// The argument of /mock-tool: a tool name, then its JSON input.
const MOCK_TOOL_ARGUMENT = /^(?<toolName>\S+)\s+(?<input>.+)$/su;

// Tool input in /mock-tool: JSON text holding an object.
const MOCK_TOOL_INPUT = z
  .string()
  .transform((text, context): unknown => {
    try {
      return JSON.parse(text);
    } catch {
      context.addIssue({ code: "custom", message: "The input is not JSON." });
      return z.NEVER;
    }
  })
  .pipe(z.record(z.string(), z.json()));

const LINE_BREAK = /\r?\n/u;

const BEVEL_PAGE = "manual/modeling/meshes/editing/edge/bevel.rst";

function textReply(text: string): MockStep[] {
  return [{ text, toolCalls: [] }];
}

// The reply to an ordinary message: Markdown with a list and a code block,
// so the chat shows its renderer working.
function markdownReply(userText: string): string {
  return [
    `This is the mock tutor. You said: "${userText}".`,
    "",
    "- Select the edges.",
    "- Press **Ctrl+B** to bevel them.",
    "",
    "```python",
    "import bpy",
    "bpy.ops.mesh.bevel(offset=0.1)",
    "```",
  ].join("\n");
}

// The reply to /mock-markdown: every kind of Markdown the tutor's replies
// use.
function mockMarkdownReply(): MockStep[] {
  return textReply(
    [
      "## Beveling an edge",
      "",
      "A bevel *rounds* a hard edge.",
      "",
      "1. Select the edge.",
      "2. Press **Ctrl+B** and move the mouse.",
      "",
      "- Scroll to add segments.",
      "- Click to confirm.",
      "",
      "| Key | Action |",
      "| --- | --- |",
      "| Ctrl+B | Bevel |",
      "",
      `Read more in [the manual](${manualUrl(BEVEL_PAGE, "bevel")}).`,
      "",
      "```python",
      "import bpy",
      "bpy.ops.mesh.bevel(offset=0.1)",
      "```",
    ].join("\n"),
  );
}

function mockToolReply(argument: string): MockStep[] {
  const { toolName = "", input = "" } =
    MOCK_TOOL_ARGUMENT.exec(argument)?.groups ?? {};
  const parsed = MOCK_TOOL_INPUT.safeParse(input);
  if (toolName === "" || !parsed.success) {
    return textReply(
      "The mock tutor needs `/mock-tool <tool name> <JSON object>`, with the input as a JSON object.",
    );
  }
  return [
    { text: "", toolCalls: [{ toolName, input: parsed.data }] },
    { text: `The mock tutor called \`${toolName}\`.`, toolCalls: [] },
  ];
}

// The reply to a search's result: each section found, cited.
function searchReply(query: string, result: MockToolResult): MockStep {
  const search = SEARCH_MANUAL_OUTPUT.safeParse(result.output);
  if (result.failed || !search.success) {
    return {
      text: `The mock tutor could not search the manual for "${query}".`,
      toolCalls: [],
    };
  }
  const { sections } = search.data;
  if (sections.length === 0) {
    return {
      text: `The manual has nothing on "${query}", so the mock tutor gives no steps.`,
      toolCalls: [],
    };
  }
  return {
    text: [
      `The manual covers "${query}":`,
      "",
      ...sections.map(
        ({ title, excerpt }, index) => `${index + 1}. **${title}**: ${excerpt}`,
      ),
    ].join("\n"),
    toolCalls: [
      {
        toolName: CITE_MANUAL_TOOL,
        input: { urls: sections.map(({ url }) => url) },
      },
    ],
  };
}

function mockSearchReply(
  query: string,
  { toolResults }: MockConversation,
): MockStep[] {
  const search: MockStep = {
    text: "",
    toolCalls: [{ toolName: SEARCH_MANUAL_TOOL, input: { query } }],
  };
  const [result] = toolResults;
  if (result === undefined) {
    return [search];
  }
  return [search, searchReply(query, result)];
}

function mockRecallReply(
  word: string,
  { systemTexts, earlierTexts }: MockConversation,
): MockStep[] {
  const wanted = word.toLowerCase();
  const lines = new Set(
    [...systemTexts, ...earlierTexts]
      .flatMap((text) => text.split(LINE_BREAK))
      .map((line) => line.trim())
      .filter((line) => line.toLowerCase().includes(wanted)),
  );
  if (word === "" || lines.size === 0) {
    return textReply(`The mock tutor recalls nothing about "${word}".`);
  }
  return textReply(
    [
      `The mock tutor recalls "${word}" in:`,
      "",
      ...[...lines].map((line) => `- ${line}`),
    ].join("\n"),
  );
}

// The default script's commands, by name.
const MOCK_COMMANDS: readonly MockCommand[] = [
  {
    name: "error",
    usage:
      "`/mock-error <Anthropic error type>` fails the reply at once with that error event, as Claude's stream does. A type Anthropic doesn't have gets a text reply naming the types.",
    reply: mockErrorReply,
  },
  {
    name: "markdown",
    usage:
      "`/mock-markdown` replies with a heading, emphasis, both kinds of list, a table, a manual link and a Python block.",
    reply: mockMarkdownReply,
  },
  {
    name: "recall",
    usage:
      "`/mock-recall <word>` replies with every line of the system prompt and the earlier messages that contains the word, ignoring case.",
    reply: mockRecallReply,
  },
  {
    name: "search",
    usage:
      "`/mock-search <query>` searches the manual for the query, then replies with each section found and cites them all, or says the manual has nothing on it.",
    reply: mockSearchReply,
  },
  {
    name: "system-prompt",
    usage:
      "`/mock-system-prompt` replies with the system prompt's text, fenced so it shows as written.",
    reply: mockSystemPromptReply,
  },
  {
    name: "tool",
    usage:
      "`/mock-tool <tool name> <JSON object>` calls that tool with that input, then says so.",
    reply: mockToolReply,
  },
];

function mockUnknownCommandReply(name: string): MockStep[] {
  return textReply(
    [
      `The mock tutor has no command \`/mock-${name}\`. It knows:`,
      "",
      ...MOCK_COMMANDS.map(({ usage }) => `- ${usage}`),
    ].join("\n"),
  );
}

// The commands in MOCK_COMMANDS, and a Markdown reply quoting any other
// message.
function defaultMockScript(
  userText: string,
  conversation: MockConversation,
): readonly MockStep[] {
  const groups = MOCK_COMMAND.exec(userText.trim())?.groups;
  if (groups === undefined) {
    return textReply(markdownReply(userText));
  }
  const { name = "", argument = "" } = groups;
  const command = MOCK_COMMANDS.find((known) => known.name === name);
  if (command === undefined) {
    return mockUnknownCommandReply(name);
  }
  return command.reply(argument, conversation);
}

export type {
  MockConversation,
  MockScript,
  MockStep,
  MockToolCall,
  MockToolResult,
};
export { defaultMockScript };
