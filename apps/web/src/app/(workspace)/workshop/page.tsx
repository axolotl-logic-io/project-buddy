import { redirect } from "next/navigation";

// Old collection bookmarks keep reaching the surviving collection.
export default function WorkshopRedirect(): never {
  redirect("/spellbook");
}
