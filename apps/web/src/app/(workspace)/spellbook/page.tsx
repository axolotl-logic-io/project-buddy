import { redirect } from "next/navigation";
import { workshopPath } from "@/routes.ts";

// Saved collection links continue into the single customization destination.
export default async function CollectionPage({
  searchParams,
}: PageProps<"/spellbook">): Promise<never> {
  const { retired } = await searchParams;
  const destination = new URL(workshopPath("spell"), "https://workshop.local");
  if (retired === "1") {
    destination.searchParams.set("retired", "1");
  }
  redirect(`${destination.pathname}${destination.search}`);
}
