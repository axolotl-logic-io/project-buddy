// Where the user starts a chat in an activity, its start page: the new
// project form for the interview, which starts every project, and the new
// chat page, with the activity chosen, for every other activity, built in
// or her own.
import { INTERVIEW_ACTIVITY_ID } from "@/activities/index.ts";

// The path of the start page of the activity with this id.
export function startPageHref(activityId: string): string {
  if (activityId === INTERVIEW_ACTIVITY_ID) {
    return "/projects";
  }
  return `/chats/new?activity=${encodeURIComponent(activityId)}`;
}
