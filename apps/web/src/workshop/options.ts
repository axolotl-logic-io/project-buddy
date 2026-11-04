import { activityChoices } from "@/activities/activity-choices.ts";
import { listBuddies } from "@/buddies/buddy-store.ts";
import { listBuddies as builtInBuddies } from "@/buddies/index.ts";
import type { UserId } from "@/ids.ts";
import type { WorkshopOptions } from "@/workshop/protocol.ts";

async function workshopOptions(owner: UserId): Promise<WorkshopOptions> {
  const [own, activities] = await Promise.all([
    listBuddies(owner),
    activityChoices(owner),
  ]);
  return {
    buddies: [...builtInBuddies(), ...own].map(({ id, name }) => ({
      id,
      name,
    })),
    activities: activities.map(({ id, name }) => ({ id, name })),
  };
}

export { workshopOptions };
