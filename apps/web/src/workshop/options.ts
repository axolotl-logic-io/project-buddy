import { activityChoices } from "@/activities/activity-choices.ts";
import { listConstructs } from "@/constructs/construct-store.ts";
import { listConstructs as builtInConstructs } from "@/constructs/index.ts";
import type { UserId } from "@/ids.ts";
import type { WorkshopOptions } from "@/workshop/protocol.ts";

async function workshopOptions(owner: UserId): Promise<WorkshopOptions> {
  const [own, activities] = await Promise.all([
    listConstructs(owner),
    activityChoices(owner),
  ]);
  return {
    constructs: [...builtInConstructs(), ...own].map(({ id, name }) => ({
      id,
      name,
    })),
    activities: activities.map(({ id, name }) => ({ id, name })),
  };
}

export { workshopOptions };
