// For the browser tests that render a page that reads the user's
// activities: vi.mock("@/activities/activity-choices.ts", () => import(...))
// gives her the built-in activities alone, without the database.
import type { ActivityChoice } from "@/activities/activity-choice.ts";
import { listActivities } from "@/activities/index.ts";

function activityChoices(): Promise<ActivityChoice[]> {
  return Promise.resolve(
    listActivities().map(({ id, name, description }) => ({
      id,
      name,
      description,
    })),
  );
}

export { activityChoices };
