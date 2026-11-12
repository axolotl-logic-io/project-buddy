// MUD-inspired commands: explicit verbs, tool-backed actions and fixed replies.
// Sheets and tool outputs are data; they never supply executable commands.
import type { LanguageModelV4 } from "@ai-sdk/provider";
import { isBuiltInOpeningKickoff } from "@/activities/index.ts";
import { CITE_BLENDER_MANUAL_TOOL } from "@/blender-manual/cite-tool-contract.ts";
import {
  SEARCH_BLENDER_MANUAL_OUTPUT,
  SEARCH_BLENDER_MANUAL_TOOL,
} from "@/blender-manual/search-tool-contract.ts";
import { isNeutralKickoff } from "@/replies/chat-kickoff.ts";
import type { ScriptConversation, ScriptStep } from "@/replies/reply-script.ts";
import { scriptedModel } from "@/replies/scripted-model.ts";
import { startingContextInPrompt } from "@/replies/starting-context.ts";
import {
  CAST_SPELL_OUTPUT,
  CAST_SPELL_TOOL,
} from "@/spells/cast-spell-contract.ts";
import { LOCAL_CONSTRUCT_COPY } from "@/ui/copy/local-construct.ts";

const COMMAND = /^\/?(?<verb>\S+)(?:\s+(?<argument>.*))?$/su;

function textStep(text: string): ScriptStep {
  return { text, toolCalls: [] };
}

function searchSteps(
  query: string,
  { toolResults }: ScriptConversation,
): ScriptStep[] {
  const search: ScriptStep = {
    text: "",
    toolCalls: [{ toolName: SEARCH_BLENDER_MANUAL_TOOL, input: { query } }],
  };
  const [result, citation] = toolResults;
  if (result === undefined) {
    return [search];
  }
  const parsed = SEARCH_BLENDER_MANUAL_OUTPUT.safeParse(result.output);
  if (result.failed || !parsed.success) {
    return [search, textStep(LOCAL_CONSTRUCT_COPY.searchFailed)];
  }
  const { sections } = parsed.data;
  if (sections.length === 0) {
    return [search, textStep(LOCAL_CONSTRUCT_COPY.noResults)];
  }
  const cite: ScriptStep = {
    text: "",
    toolCalls: [
      {
        toolName: CITE_BLENDER_MANUAL_TOOL,
        input: { urls: sections.map(({ url }) => url) },
      },
    ],
  };
  if (citation === undefined) {
    return [search, cite];
  }
  const lines = sections.map(
    ({ label, excerpt }, index) => `${index + 1}. **${label}**: ${excerpt}`,
  );
  if (citation.failed) {
    lines.unshift(LOCAL_CONSTRUCT_COPY.citationFailed);
  }
  return [search, cite, textStep(lines.join("\n\n"))];
}

function castSteps(
  spellId: string,
  { toolResults }: ScriptConversation,
): ScriptStep[] {
  const cast: ScriptStep = {
    text: "",
    toolCalls: [{ toolName: CAST_SPELL_TOOL, input: { spellId } }],
  };
  const [result] = toolResults;
  if (result === undefined) {
    return [cast];
  }
  const parsed = CAST_SPELL_OUTPUT.safeParse(result.output);
  if (result.failed || !parsed.success) {
    return [cast, textStep(LOCAL_CONSTRUCT_COPY.castFailed)];
  }
  if (parsed.data.status === "unknown") {
    return [cast, textStep(LOCAL_CONSTRUCT_COPY.unknownSpell)];
  }
  return [cast, textStep(LOCAL_CONSTRUCT_COPY.cast(parsed.data.name))];
}

function localReply(
  userText: string,
  conversation: ScriptConversation,
): ScriptStep[] {
  if (isBuiltInOpeningKickoff(userText) || isNeutralKickoff(userText)) {
    return [textStep(LOCAL_CONSTRUCT_COPY.welcome)];
  }
  const { verb = "", argument = "" } =
    COMMAND.exec(userText.trim())?.groups ?? {};
  switch (verb.toLowerCase()) {
    case "help":
      return [textStep(LOCAL_CONSTRUCT_COPY.help)];
    case "look": {
      const context = startingContextInPrompt(
        conversation.systemTexts.join("\n\n"),
      );
      return [textStep(LOCAL_CONSTRUCT_COPY.look(context))];
    }
    case "search":
      if (argument !== "") {
        return searchSteps(argument, conversation);
      }
      return [textStep(LOCAL_CONSTRUCT_COPY.searchUsage)];
    case "cast":
      if (argument !== "") {
        return castSteps(argument, conversation);
      }
      return [textStep(LOCAL_CONSTRUCT_COPY.castUsage)];
    default:
      return [textStep(LOCAL_CONSTRUCT_COPY.unknownCommand)];
  }
}

function localConstructModel(): LanguageModelV4 {
  return scriptedModel(localReply, {
    provider: "local",
    modelId: "construct-commands",
    usage: {
      inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 0, text: 0, reasoning: undefined },
    },
  });
}

export { localConstructModel };
