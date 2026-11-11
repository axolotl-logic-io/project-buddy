import { redirect } from "next/navigation";
import { workshopPath } from "@/routes.ts";

// The old Activities page's address, from links and bookmarks, opens the
// Workshop's Activities tab: activities are instructions to customize, not
// a place to start from. It makes nothing and spends nothing.
export default function OldActivitiesPage(): never {
  redirect(workshopPath("activity"));
}
