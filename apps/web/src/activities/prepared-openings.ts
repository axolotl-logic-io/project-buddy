import type { ActivityDefinition, ActivityId } from "@/activities/activity.ts";
import type { BuddyDefinition, BuddyId } from "@/buddies/index.ts";
import {
  matchingBuiltInActivity,
  matchingBuiltInBuddy,
} from "@/prompts/matching-built-in.ts";

const PREPARED_OPENINGS: Readonly<
  Record<ActivityId, Readonly<Record<BuddyId, string>>>
> = {
  "open-chat": {
    hippy:
      "Hey there, friend. Glad you stopped by. What's on your mind today: something to work on, an idea to talk through, or a question?",
    "mr-tee":
      "Alright, you showed up. That's step one. Now tell me: what are we working on today?",
    "fjord-tines":
      "Ah, a fresh page in the field notebook! Observation: the possibilities are wide open. What shall we investigate today?",
    "span-tines":
      "Alright, kid, the shop's open. What can I do for you today? First question's on the house.",
    "argon-sprangler":
      "Hello. This chat is now running. State your question or the work you would like to do, and we will proceed from there.",
    "roland-dustchain":
      "Well met. Sit a while. Tell me what brings you to this fire: a task, a question, or an idea to talk through?",
  },
  interview: {
    hippy:
      "Far out, a new quest. Let's settle in and get to know it, friend. To start us off: what would you like to make or learn?",
    "mr-tee":
      "New quest. I like it. Before we train, I need the target. What do you want to make or learn?",
    "fjord-tines":
      "A new quest: an uncharted dimension, waiting to be documented! First entry for the notebook: what do you want to make or learn?",
    "span-tines":
      "A new quest, huh? Could be a real money-maker. Before I sign anything: what do you want to make or learn?",
    "argon-sprangler":
      "A new quest. To define it precisely, I need its first parameter. What do you want to make or learn?",
    "roland-dustchain":
      "A new road begins here. Before we walk it, I would know where it leads. What do you want to make or learn?",
  },
  brainstorming: {
    hippy:
      "Okay, let's let the ideas drift in, no rush. What idea or plan would you like to explore today, friend?",
    "mr-tee":
      "Time to put some ideas through their paces. What idea or plan are we testing today?",
    "fjord-tines":
      "Excellent, a brainstorming expedition! Every good discovery starts with a strange idea. What idea or plan shall we examine?",
    "span-tines":
      "Ideas, eh? Cheapest thing in the world, and the good ones are still a bargain. What idea or plan are we kicking around?",
    "argon-sprangler":
      "Brainstorming: the systematic production of ideas, most of which will be discarded. That is the efficient part. What idea or plan would you like to examine?",
    "roland-dustchain":
      "Ideas are like tracks in the dust. Some lead somewhere, some don't. Which idea or plan shall we follow a while?",
  },
  "project-breakdown": {
    hippy:
      "Let's take this big journey one step at a time, friend. Which goal would you like to break down into steps?",
    "mr-tee":
      "Big goals get done one rep at a time. Which goal are we breaking down?",
    "fjord-tines":
      "Hypothesis: any goal, however vast, breaks down into steps we can test. Which goal shall we dissect first?",
    "span-tines":
      "Here's the trick nobody tells you: a big job is just a bunch of small jobs in a trench coat. Which goal are we breaking down?",
    "argon-sprangler":
      "A goal is easier to reach once it is divided into measurable steps. Which goal would you like to divide?",
    "roland-dustchain":
      "Every long road is walked one camp at a time. Which goal shall we break into steps?",
  },
};

function preparedOpening(
  buddy: BuddyDefinition,
  activity: ActivityDefinition,
): string | undefined {
  const builtInBuddy = matchingBuiltInBuddy(buddy);
  const builtInActivity = matchingBuiltInActivity(activity);
  if (builtInBuddy === undefined || builtInActivity === undefined) {
    return undefined;
  }
  return PREPARED_OPENINGS[builtInActivity.id][builtInBuddy.id];
}

export { preparedOpening };
