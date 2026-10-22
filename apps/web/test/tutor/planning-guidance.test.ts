// These assertions concern required supplied instructions, not stochastic
// model output. Inclusion tests alone would still pass if a default became
// empty or lost its consent, interview or one-question boundaries.
import { expect, test } from "vitest";
import { type BuddyParts, getBuddy } from "@/buddies/index.ts";
import { renderTutorInstructions } from "@/tutor/system-prompt.ts";

const DEFAULT_PARTS: BuddyParts = getBuddy("hippy").parts;

const GUIDANCE = [
  {
    label: "dependency-aware brainstorming",
    key: "brainstorming",
    requirements: [
      "When the user asks to brainstorm, explore an idea or stress-test a plan",
      "Start from the conversation and any project memory, not a fresh questionnaire",
      "settle a prerequisite before asking about choices that depend on it",
      "Ask at most one question in a message",
      "offer a recommended answer with its tradeoff, and wait",
      "A recommendation is not the user's decision",
      "Surface assumptions, alternatives and likely failure points",
      "Do not claim access to their files or tools the app does not provide",
      "Summarize agreed decisions and what remains open",
      "Brainstorming alone is not permission to create a project or change memory",
      "Use this skill when requested, not instead of the project's interview or an ordinary lesson",
    ],
  },
  {
    label: "actionable project breakdown",
    key: "projectBreakdown",
    requirements: [
      "When the user asks for a project plan, milestones or a breakdown",
      "Use the conversation and any project memory",
      "scope, constraints and current skill level",
      "If an essential choice is missing, ask one focused question",
      "Give each a concrete result and a way to tell it is done",
      "show which earlier results it depends on",
      "small, actionable tasks",
      "Name the first practical next step",
      "Identify assumptions, risks and unresolved decisions",
      "Offer the breakdown for the user's agreement",
      "A proposed plan alone does not authorize creating a project or overwriting memory",
      "Preserve the project interview and its save rules",
      "Use this skill when requested, without interrupting an ordinary lesson",
    ],
  },
] as const;

test.each(GUIDANCE)(
  "the supplied default retains $label guidance",
  ({ key, requirements }) => {
    const [shared] = renderTutorInstructions({
      kind: "central",
      buddy: getBuddy("hippy"),
      userName: undefined,
      hiddenFlags: [],
    });

    expect(shared?.content).toContain(DEFAULT_PARTS[key]);
    for (const requirement of requirements) {
      expect(DEFAULT_PARTS[key]).toContain(requirement);
    }
  },
);
