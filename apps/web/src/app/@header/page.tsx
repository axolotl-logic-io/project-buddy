import type { JSX } from "react";
import { HeaderLinksAt } from "@/components/header-links.tsx";

// Match Home explicitly so soft navigation replaces the active header slot.
export default function HomeHeader(): Promise<JSX.Element> {
  return HeaderLinksAt({ path: [] });
}
