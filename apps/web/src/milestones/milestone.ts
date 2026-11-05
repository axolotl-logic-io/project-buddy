// A milestone: something the user got done in a project, a short line the
// construct records from one of the project's chats, dated and linked to that
// chat. A project's milestones, newest first, are its progress timeline. It
// imports nothing from the server, because the browser checks a milestone's
// text with the same rule.
import { z } from "zod";
import type { ChatId, MilestoneId } from "@/ids.ts";

// The longest text a milestone may have: one line, about a sentence.
const MILESTONE_TEXT_MAX_LENGTH = 200;

const LINE_BREAK = /[\r\n]/u;

// A milestone's text as it is saved: trimmed, not empty, one line and at
// most MILESTONE_TEXT_MAX_LENGTH characters.
const MILESTONE_TEXT = z
  .string()
  .trim()
  .min(1)
  .max(MILESTONE_TEXT_MAX_LENGTH)
  .refine((text) => !LINE_BREAK.test(text));

interface Milestone {
  readonly id: MilestoneId;
  // The chat it was recorded in.
  readonly chatId: ChatId;
  readonly text: string;
  readonly recordedAt: Date;
}

export type { Milestone };
export { MILESTONE_TEXT, MILESTONE_TEXT_MAX_LENGTH };
