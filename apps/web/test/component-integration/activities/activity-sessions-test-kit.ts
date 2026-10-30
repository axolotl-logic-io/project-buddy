// For the browser tests that render a chat's page:
// vi.mock("@/activities/activity-sessions.ts", () => import(...)) puts every
// chat in the open chat, and no project has an interview chat, without the
// database. Changing a chat's activity is
// the server tests' to check.
import { vi } from "vitest";
import type { ChatActivity } from "@/activities/chosen-activity.ts";
import {
  activitySnapshotOf,
  DEFAULT_ACTIVITY_ID,
  getActivity,
} from "@/activities/index.ts";

function currentActivity(): Promise<ChatActivity> {
  return Promise.resolve({
    id: DEFAULT_ACTIVITY_ID,
    ...activitySnapshotOf(getActivity(DEFAULT_ACTIVITY_ID)),
  });
}

// No project has an interview chat.
function interviewChatOf(): Promise<undefined> {
  return Promise.resolve(undefined);
}

const enterActivity = vi.fn();
const newSession = vi.fn();

export { currentActivity, enterActivity, interviewChatOf, newSession };
