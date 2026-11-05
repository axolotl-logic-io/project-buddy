// The project choice that makes a new project, named when the adventure starts.
const NEW_PROJECT = "new";

interface NewChatSelection {
  readonly activityId: string;
  readonly projectId: string;
}

// Older interview links now start a quest in Project Breakdown.
function initialSelection(selection: NewChatSelection): NewChatSelection {
  if (selection.activityId === "interview") {
    return {
      activityId: "project-breakdown",
      projectId: selection.projectId || NEW_PROJECT,
    };
  }
  return selection;
}

function chooseActivity(
  selection: NewChatSelection,
  activityId: string,
): NewChatSelection {
  return { ...selection, activityId };
}

function chooseProject(
  selection: NewChatSelection,
  projectId: string,
): NewChatSelection {
  return { ...selection, projectId };
}

export type { NewChatSelection };
export { chooseActivity, chooseProject, initialSelection, NEW_PROJECT };
