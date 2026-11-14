import type { JSX } from "react";
import { HeaderLinksAt } from "@/components/header-links.tsx";

// Match this collection explicitly so soft navigation replaces the active header slot.
export default function CollectionHeader(): Promise<JSX.Element> {
  return HeaderLinksAt({ path: ["quests"] });
}
