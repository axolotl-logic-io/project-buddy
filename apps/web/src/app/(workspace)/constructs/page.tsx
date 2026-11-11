import { redirect } from "next/navigation";
import { workshopPath } from "@/routes.ts";

// Saved collection links continue into the single customization destination.
export default async function CollectionPage({
  searchParams,
}: PageProps<"/constructs">): Promise<never> {
  const { retired } = await searchParams;
  const destination = workshopPath("construct");
  if (retired === "1") {
    redirect(`${destination}?retired=1`);
  }
  redirect(destination);
}
