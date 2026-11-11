// Check-ins: on the schedule the user picks for a quest, its construct
// appends a short message about where the user left off and one small next
// step to the quest's conversation, unread (src/conversations/check-in.ts),
// and emails it to the user with a link to the quest. The scheduler runs
// runCheckIns; check-in-store.ts says which projects are due. Each project
// is claimed before its construct writes, so a second run at the same time, or
// soon after, starts no second check-in. A check-in skipped because the
// owner is out of gold keeps its claim, so the project waits its interval
// like any other, rather than going first in every run. One that failed, because Claude is unavailable or something
// broke, is given up, so the next run tries again.

import type { NewMessage } from "@/chats/chat-rows.ts";
import {
  claimCheckIn,
  type DueCheckIn,
  listDueCheckIns,
  releaseCheckIn,
} from "@/check-ins/check-in-store.ts";
import { checkInsOffUrl } from "@/check-ins/check-ins-off-link.ts";
import { appendCheckIn } from "@/conversations/check-in.ts";
import { checkInEmail } from "@/email/check-in-email.ts";
import { EmailFailure } from "@/email/email-failure.ts";
import { sendEmail } from "@/email/send-email.ts";
import {
  logAppError,
  logCheckInBacklog,
  logEmailFailure,
} from "@/errors/error-log.ts";
import { toAppError } from "@/errors/to-app-error.ts";

// How many check-ins are written at once.
const CHECK_INS_AT_ONCE = 5;

// The most projects one run of the scheduler checks in on; the rest are
// still due on the next run.
const CHECK_INS_PER_RUN = 25;

// What one run did with each due project: started its check-in; skipped
// it, because another run claimed it, the owner is out of gold or the
// conversation awaits a reply; or
// failed to, because Claude is unavailable or something broke, which is
// logged.
type CheckInOutcome = "started" | "skipped" | "failed";

// How many due projects each outcome had.
type CheckInsRun = Readonly<Record<CheckInOutcome, number>>;

// A message's text, its text parts one after another.
function messageText({ parts }: NewMessage): string {
  return parts
    .flatMap((part) => {
      if (part.type === "text") {
        return [part.text];
      }
      return [];
    })
    .join("\n\n");
}

// Emails the owner the check-in's message, with links on origin, once per
// message. A failure is logged and the message stays, unread, in the quest's
// conversation.
async function emailCheckIn(
  { owner, email, project }: DueCheckIn,
  constructName: string,
  message: NewMessage,
  origin: string,
): Promise<void> {
  try {
    await sendEmail(
      checkInEmail({
        to: email,
        constructName,
        projectName: project.name,
        message: messageText(message),
        questUrl: new URL(`/projects/${project.id}`, origin).href,
        offUrl: await checkInsOffUrl(origin, {
          owner,
          projectId: project.id,
        }),
        idempotencyKey: `check-in/${message.id}`,
      }),
    );
  } catch (error) {
    let problem: EmailFailure["problem"] = "our-bug";
    if (error instanceof EmailFailure) {
      ({ problem } = error);
    }
    logEmailFailure(problem, "send check-in", error);
  }
}

// The check-in on one due project, emailed to its owner with links on
// origin.
async function checkIn(
  due: DueCheckIn,
  origin: string,
): Promise<CheckInOutcome> {
  const { owner, project } = due;
  if (!(await claimCheckIn(owner, project.id))) {
    return "skipped";
  }
  try {
    const result = await appendCheckIn(owner, project);
    if (result.kind === "outOfGold" || result.kind === "awaitingReply") {
      return "skipped";
    }
    if (result.kind === "claudeUnavailable") {
      await releaseCheckIn(owner, project.id);
      return "failed";
    }
    await emailCheckIn(due, result.chat.construct.name, result.message, origin);
    return "started";
  } catch (error) {
    toAppError(error, "check-in");
    await releaseCheckIn(owner, project.id).catch((releaseError: unknown) => {
      logAppError("unknown", "release check-in", releaseError);
    });
    return "failed";
  }
}

// The check-ins on the due projects, CHECK_INS_AT_ONCE at a time, each
// batch after the one before.
async function checkInBatches(
  due: readonly DueCheckIn[],
  origin: string,
): Promise<CheckInOutcome[]> {
  if (due.length === 0) {
    return [];
  }
  const outcomes = await Promise.all(
    due.slice(0, CHECK_INS_AT_ONCE).map((one) => checkIn(one, origin)),
  );
  return [
    ...outcomes,
    ...(await checkInBatches(due.slice(CHECK_INS_AT_ONCE), origin)),
  ];
}

// Starts the check-ins of the projects due one now, longest-waiting first,
// at most limit of them and a few at a time, and says how each went. A run
// that leaves due projects for the next one logs it, so a backlog shows.
// The links in their emails lead to origin.
async function runCheckIns(
  origin: string,
  limit: number = CHECK_INS_PER_RUN,
): Promise<CheckInsRun> {
  const due = await listDueCheckIns(limit + 1);
  if (due.length > limit) {
    logCheckInBacklog(limit);
  }
  const outcomes = await checkInBatches(due.slice(0, limit), origin);
  return {
    started: outcomes.filter((outcome) => outcome === "started").length,
    skipped: outcomes.filter((outcome) => outcome === "skipped").length,
    failed: outcomes.filter((outcome) => outcome === "failed").length,
  };
}

export type { CheckInsRun };
export { runCheckIns };
