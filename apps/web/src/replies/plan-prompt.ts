// The prompt section that gives every chat in a project the project's plan,
// as the prompt read it when the turn started, between tags: each step on a
// line of its own, with the number change_plan names it by.
import { nextPlanStep, type Plan, type PlanStep } from "@/plan/plan.ts";
import type { ReplyPromptContext } from "@/replies/system-prompt.ts";
import { CHANGE_PLAN_TOOL } from "@/replies/tools/change-plan-contract.ts";

// The line the prompt gives while the plan has no steps.
const EMPTY_PLAN_PROMPT = `The quest's plan has no steps yet. When the user agrees on what to do next, add the steps with \`${CHANGE_PLAN_TOOL}\`.`;

// The line before the plan.
const PLAN_PROMPT_INTRO =
  "The quest's plan: its steps of remaining work, in order, each with its number. Done steps are marked [done]. The first open step is the quest's next step. The user can change the plan without you, so this is the plan as it is now:";

const PLAN_START_TAG = "<quest_plan>";
const PLAN_END_TAG = "</quest_plan>";

function stepLine({ number, text, done }: PlanStep): string {
  if (done) {
    return `#${number} [done] ${text}`;
  }
  return `#${number} ${text}`;
}

// The plan's steps as the prompt gives them.
function planLines(plan: Plan): string[] {
  return plan.steps.map(stepLine);
}

// The project's plan, between tags that keep it apart from the rest of the
// prompt, or "" in a standalone chat, which has no project and so no plan.
function planPromptSection({ project }: ReplyPromptContext): string {
  if (project === undefined) {
    return "";
  }
  if (project.plan.steps.length === 0) {
    return EMPTY_PLAN_PROMPT;
  }
  const next = nextPlanStep(project.plan);
  const lines = [
    PLAN_PROMPT_INTRO,
    PLAN_START_TAG,
    ...planLines(project.plan),
    PLAN_END_TAG,
  ];
  if (next === undefined) {
    lines.push("Every step is done.");
  }
  return lines.join("\n");
}

export { EMPTY_PLAN_PROMPT, PLAN_END_TAG, PLAN_START_TAG, planPromptSection };
