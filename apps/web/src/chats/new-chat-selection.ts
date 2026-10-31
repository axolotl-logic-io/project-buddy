// The new-chat form's activity and project, which go together: the project
// interview starts a new project, and a new project starts in the interview.
// Choosing one of the pair chooses the other, and leaving one leaves the
// other, so the form never shows an interview without a new project.
import {
  DEFAULT_ACTIVITY_ID,
  INTERVIEW_ACTIVITY_ID,
} from "@/activities/activity.ts";

// The project choice that makes a new project, named when the chat starts.
const NEW_PROJECT = "new";

// The form's activity, by id, and its project: a project's id, NEW_PROJECT,
// or "" for none.
interface NewChatSelection {
  readonly activityId: string;
  readonly projectId: string;
}

// The selection to show first: the given activity and project, with a new
// project for the interview.
function initialSelection(selection: NewChatSelection): NewChatSelection {
  if (selection.activityId === INTERVIEW_ACTIVITY_ID) {
    return { ...selection, projectId: NEW_PROJECT };
  }
  return selection;
}

// The selection after choosing the activity: the interview brings a new
// project, and another activity leaves a new project for none.
function chooseActivity(
  { projectId }: NewChatSelection,
  activityId: string,
): NewChatSelection {
  if (activityId === INTERVIEW_ACTIVITY_ID) {
    return { activityId, projectId: NEW_PROJECT };
  }
  if (projectId === NEW_PROJECT) {
    return { activityId, projectId: "" };
  }
  return { activityId, projectId };
}

// The selection after choosing the project: a new project brings the
// interview, and another project leaves the interview for the default
// activity.
function chooseProject(
  { activityId }: NewChatSelection,
  projectId: string,
): NewChatSelection {
  if (projectId === NEW_PROJECT) {
    return { activityId: INTERVIEW_ACTIVITY_ID, projectId };
  }
  if (activityId === INTERVIEW_ACTIVITY_ID) {
    return { activityId: DEFAULT_ACTIVITY_ID, projectId };
  }
  return { activityId, projectId };
}

export type { NewChatSelection };
export { chooseActivity, chooseProject, initialSelection, NEW_PROJECT };
