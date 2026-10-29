// Saved account switches, not presentation cookies, select the skill text
// sent through the real chat route. Mock replies quote the received prompt;
// they do not prove what a stochastic model would say when asked to plan.
import { describe, expect, test } from "vitest";
import {
  findUserByEmail,
  readPromptPreferences,
  saveUserName,
} from "@/accounts/users-store.ts";
import { type Buddy, getBuddy } from "@/buddies/index.ts";
import { createStandaloneChat } from "@/chats/standalone-chat.ts";
import { hiddenFlagsCookie } from "@/flags/flag-choice.ts";
import { DEFAULT_HIDDEN_FLAGS, type FlagId } from "@/flags/flags.ts";
import { saveHiddenFlagsAction } from "@/flags/save-hidden-flags-action.ts";
import { seedHiddenFlags } from "@/flags/seed-hidden-flags.ts";
import { buddyPrompt } from "../test-database/chat-test-kit.ts";
import { testData } from "../test-database/data-test-kit.ts";
import {
  clearCookies,
  sessionCookies,
  signIn,
} from "../test-database/session-test-kit.ts";
import { testUser } from "../test-database/user-test-kit.ts";

const CHOICES: readonly { readonly hidden: readonly FlagId[] }[] = [
  { hidden: [] },
  { hidden: ["brainstorming"] },
  { hidden: ["project-breakdown"] },
  { hidden: ["brainstorming", "project-breakdown"] },
];

const SKILL_FLAGS: readonly FlagId[] = ["brainstorming", "project-breakdown"];

const BUDDY: Buddy = {
  ...getBuddy("mr-tee"),
  parts: {
    ...getBuddy("mr-tee").parts,
    brainstorming: "Explore {{name}}'s choices.",
    projectBreakdown: "Plan {{name}}'s milestones.",
  },
};

describe("use_case_switch_planning_skills", () => {
  test.each(CHOICES)(
    "account switches $hidden survive a new session and isolate the owner",
    async ({ hidden }) => {
      const [her, other] = await Promise.all([testUser(), testUser()]);
      await saveUserName(her.id, "Mabel");
      await saveUserName(other.id, "Dipper");
      const [hers, theirs] = await Promise.all([
        createStandaloneChat(her.id, BUDDY),
        createStandaloneChat(other.id, BUDDY),
      ]);

      await signIn(her);
      await saveHiddenFlagsAction([...DEFAULT_HIDDEN_FLAGS, ...hidden]);
      expect(await readPromptPreferences(her.id)).toEqual({
        userName: "Mabel",
        hiddenExtras: hidden,
      });

      // A new browser/session loads the account's choice at sign-in.
      clearCookies();
      const saved = await findUserByEmail(her.email);
      if (saved === undefined) {
        throw new Error("The test account is gone");
      }
      await seedHiddenFlags(saved.hiddenExtras);
      await signIn(saved);
      // Forge the opposite presentation choice: it cannot control the model.
      const forged = SKILL_FLAGS.filter((id) => !hidden.includes(id));
      (await sessionCookies()).set(hiddenFlagsCookie(forged));
      const prompt = await buddyPrompt(hers.id);
      expect(prompt.includes("Explore Mabel's choices.")).toBe(
        !hidden.includes("brainstorming"),
      );
      expect(prompt.includes("Plan Mabel's milestones.")).toBe(
        !hidden.includes("project-breakdown"),
      );
      expect(prompt).not.toContain("Dipper");

      // The same buddy/cache prefix never inherits another owner's switches/name,
      // even in the same browser with her forged cookie still present.
      await signIn(other);
      const otherPrompt = await buddyPrompt(theirs.id);
      expect(otherPrompt).toContain("Explore Dipper's choices.");
      expect(otherPrompt).toContain("Plan Dipper's milestones.");
      expect(otherPrompt).not.toContain("Mabel");
      expect(await readPromptPreferences(other.id)).toEqual({
        userName: "Dipper",
        hiddenExtras: [],
      });
    },
  );
});

async function defaultPrompts(): Promise<string[]> {
  const user = await testUser();
  const data = testData(user);
  const project = await data.project();
  const [lesson, standalone] = await Promise.all([
    data.chat(project),
    createStandaloneChat(user.id),
  ]);
  await signIn(user);

  const prompts = [
    await buddyPrompt(lesson.id),
    await buddyPrompt(standalone.id),
  ];
  return prompts;
}

describe("use_case_buddy_brainstorming", () => {
  test("default brainstorming instructions reach project and standalone replies", async () => {
    for (const prompt of await defaultPrompts()) {
      expect(prompt).toContain("# Brainstorming");
    }
  });
});

describe("use_case_project_breakdown", () => {
  test("default breakdown instructions reach project and standalone replies", async () => {
    for (const prompt of await defaultPrompts()) {
      expect(prompt).toContain("# Project breakdown");
    }
  });
});

test.each(CHOICES)(
  "project replies honor saved switches $hidden independently",
  async ({ hidden }) => {
    const user = await testUser();
    const data = testData(user);
    const lesson = await data.chat(await data.project());
    await signIn(user);

    await saveHiddenFlagsAction([...DEFAULT_HIDDEN_FLAGS, ...hidden]);
    const prompt = await buddyPrompt(lesson.id);
    expect(prompt.includes("# Brainstorming")).toBe(
      !hidden.includes("brainstorming"),
    );
    expect(prompt.includes("# Project breakdown")).toBe(
      !hidden.includes("project-breakdown"),
    );
  },
);
