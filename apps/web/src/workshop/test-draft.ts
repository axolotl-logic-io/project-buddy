// Temporary conversations use the chat's prompt renderer and metered model,
// but have no chat/project id and no tools that can change stored data.
import { generateText, isStepCount, type ModelMessage, tool } from "ai";
import { withUserName } from "@/accounts/user-name.ts";
import { readUserName } from "@/accounts/users-store.ts";
import { chosenActivity } from "@/activities/chosen-activity.ts";
import { chosenBuddy } from "@/buddies/chosen-buddy.ts";
import { AppError } from "@/errors/app-error.ts";
import type { UserId } from "@/ids.ts";
import { checkGold } from "@/quota/quota.ts";
import { replyModel } from "@/replies/model.ts";
import { renderReplyInstructions } from "@/replies/system-prompt.ts";
import {
  CAST_SPELL_DESCRIPTION,
  CAST_SPELL_INPUT,
  CAST_SPELL_TOOL,
  unknownSpellMessage,
} from "@/spells/cast-spell-contract.ts";
import type { CastableSpell } from "@/spells/chosen-spell.ts";
import { chosenSpell } from "@/spells/chosen-spell.ts";
import { spellChoices } from "@/spells/spell-choices.ts";
import type { WorkshopRequest, WorkshopResult } from "@/workshop/protocol.ts";

const TEST_RULES =
  "This is a temporary Workshop test. Only cast_spell is available. Do not claim to search, change activities, create projects, change project memory, record milestones or generate images. Explain when the user's request needs those unavailable tools.";
const MAX_STEPS = 6;

async function testDraft(
  owner: UserId,
  request: WorkshopRequest,
  signal: AbortSignal = new AbortController().signal,
): Promise<WorkshopResult> {
  const { draft } = request;
  const [buddy, activity, spells, userName] = await Promise.all([
    chosenBuddy(owner, request.buddyId),
    chosenActivity(owner, request.activityId),
    spellChoices(owner),
    readUserName(owner),
  ]);
  if (buddy === undefined || activity === undefined) {
    throw new AppError("not-found", undefined);
  }
  // The source must exist and belong to the acting user, even for a forged
  // request that supplies complete replacement instructions.
  if (
    draft.kind === "buddy" &&
    (await chosenBuddy(owner, draft.id)) === undefined
  ) {
    throw new AppError("not-found", undefined);
  }
  if (
    draft.kind === "activity" &&
    (await chosenActivity(owner, draft.id)) === undefined
  ) {
    throw new AppError("not-found", undefined);
  }
  if (
    draft.kind === "spell" &&
    (await chosenSpell(owner, draft.id)) === undefined
  ) {
    throw new AppError("not-found", undefined);
  }
  let testBuddy = buddy.buddy;
  let testActivity = activity;
  if (draft.kind === "buddy") {
    testBuddy = {
      ...buddy.buddy,
      name: draft.name,
      definition: { prompt: draft.prompt },
    };
  }
  if (draft.kind === "activity") {
    testActivity = {
      ...activity,
      name: draft.name,
      definition: {
        prompt: draft.prompt,
        openingRequest: draft.openingRequest,
      },
    };
  }
  const choices = spells.map((spell) => {
    if (draft.kind === "spell" && spell.id === draft.id) {
      return { ...spell, name: draft.name, whenToUse: draft.whenToUse };
    }
    return spell;
  });
  async function resolveSpell(id: string): Promise<CastableSpell | undefined> {
    const spell = await chosenSpell(owner, id);
    if (spell !== undefined && draft.kind === "spell" && id === draft.id) {
      return {
        ...spell,
        name: draft.name,
        definition: { prompt: draft.prompt, whenToUse: draft.whenToUse },
      };
    }
    return spell;
  }
  const casts: WorkshopResult["casts"] = [];
  const loaded: string[] = [];
  const ids = new Set(request.castIds);
  if (draft.kind === "spell" && request.forceCast) {
    ids.add(draft.id);
  }
  const previousSpells = await Promise.all([...ids].map(resolveSpell));
  for (const spell of previousSpells) {
    if (spell !== undefined) {
      loaded.push(withUserName(spell.definition.prompt, userName));
      casts.push({ id: spell.id, name: spell.name });
    }
  }
  const instructions = renderReplyInstructions({
    activities: [],
    spells: choices,
    project: undefined,
    buddy: testBuddy,
    activity: testActivity,
    userName,
  });
  instructions.push({
    role: "system",
    content: [TEST_RULES, ...loaded].join("\n\n"),
  });
  const messages: ModelMessage[] = [...request.history];
  let { message } = request;
  if (request.opening) {
    if (draft.kind !== "activity" || request.history.length > 0) {
      throw new AppError("invalid-request", undefined);
    }
    message = withUserName(testActivity.definition.openingRequest, userName);
  }
  if (message.trim() === "") {
    message = "Open this activity with a brief greeting.";
  }
  messages.push({ role: "user", content: message });
  const gold = await checkGold(owner);
  if (gold.kind === "outOfGold") {
    throw new AppError("out-of-gold", undefined);
  }
  const model = replyModel(gold.grant);
  const result = await generateText({
    model,
    system: instructions,
    messages,
    abortSignal: signal,
    stopWhen: isStepCount(MAX_STEPS),
    maxOutputTokens: 3000,
    tools: {
      [CAST_SPELL_TOOL]: tool({
        description: CAST_SPELL_DESCRIPTION,
        inputSchema: CAST_SPELL_INPUT,
        execute: async ({ spellId }: { spellId: string }): Promise<unknown> => {
          const spell = await resolveSpell(spellId);
          if (spell === undefined) {
            return {
              status: "unknown",
              spellId,
              message: unknownSpellMessage(spellId),
            };
          }
          casts.push({ id: spellId, name: spell.name });
          return {
            status: "cast",
            spellId,
            name: spell.name,
            instructions: withUserName(spell.definition.prompt, userName),
          };
        },
      }),
    },
  });
  let text = result.steps
    .map((step) => step.text)
    .filter(Boolean)
    .join("\n\n");
  if (text.trim() === "") {
    const answer = await generateText({
      model,
      system: instructions,
      messages: [
        ...messages,
        ...result.responseMessages,
        {
          role: "user",
          content:
            "Write your answer now using the instructions already loaded. No more tool calls.",
        },
      ],
      abortSignal: signal,
      maxOutputTokens: 3000,
    });
    ({ text } = answer);
  }
  if (request.opening) {
    return { text, casts, openingText: message };
  }
  return { text, casts };
}

export { testDraft };
