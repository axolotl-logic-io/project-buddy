import { describe, expect, test } from "vitest";
import { listBuddies } from "@/buddies/index.ts";
import { DEFAULT_HIDDEN_FLAGS } from "@/flags/flags.ts";
import { EMPTY_MEMORY } from "@/memory/memory.ts";
import { INTERVIEW_PROMPT } from "@/tutor/interview-prompt.ts";
import {
  BRAINSTORMING_PROMPT,
  PROJECT_BREAKDOWN_PROMPT,
} from "@/tutor/planning-prompts.ts";
import {
  renderTutorInstructions,
  type TutorPromptContext,
} from "@/tutor/system-prompt.ts";

// Every built-in must supply the defaults, including ordinary lessons and
// standalone chats where no project interview should be supplied.
describe.each(listBuddies())("$name planning defaults", (buddy) => {
  test.each(["central", "lesson", "interview"] as const)(
    "supplies both skills in a %s without changing the interview boundary",
    (place) => {
      const common = {
        buddy,
        userName: undefined,
        hiddenFlags: DEFAULT_HIDDEN_FLAGS,
      };
      let context: TutorPromptContext;
      if (place === "central") {
        context = { kind: "central", ...common };
      } else {
        context = {
          kind: "project",
          ...common,
          projectName: "Low-poly fox",
          isInterviewChat: place === "interview",
          memory: EMPTY_MEMORY,
        };
      }
      const original = structuredClone(buddy);
      const [shared, chat] = renderTutorInstructions(context);

      expect(buddy.parts.brainstorming).toBe(BRAINSTORMING_PROMPT);
      expect(buddy.parts.projectBreakdown).toBe(PROJECT_BREAKDOWN_PROMPT);
      expect(shared?.content).toContain(BRAINSTORMING_PROMPT);
      expect(shared?.content).toContain(PROJECT_BREAKDOWN_PROMPT);
      expect(shared?.content).not.toContain(INTERVIEW_PROMPT);
      expect(chat?.content.includes(INTERVIEW_PROMPT)).toBe(
        place === "interview",
      );
      expect(buddy).toEqual(original);
    },
  );
});
