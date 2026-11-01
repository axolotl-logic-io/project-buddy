// Where the user starts a chat in an activity, its start page: the new chat
// page, with the activity chosen, for every activity, built in or her own.
// For the project interview, that page chooses a new project too.

// The path of the start page of the activity with this id.
export function startPageHref(activityId: string): string {
  return `/chats/new?activity=${encodeURIComponent(activityId)}`;
}
