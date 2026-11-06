import type { ComponentProps } from "react";
import type { Icon } from "@/components/ui/icon.tsx";
import { ACTIVITIES_COPY } from "@/ui/copy/activities.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { CONSTRUCTS_COPY } from "@/ui/copy/constructs.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";
import { MARKETPLACE_COPY } from "@/ui/copy/marketplace.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { WORKSHOP_COPY } from "@/ui/copy/workshop.ts";

interface AtlasPlace {
  readonly id: string;
  readonly href: string;
  readonly name: string;
  readonly description: string;
  readonly icon: ComponentProps<typeof Icon>["name"];
}

// Destinations share one reading and keyboard order at every screen size.
const ATLAS_PLACES: readonly AtlasPlace[] = [
  {
    id: "quests",
    href: "/projects",
    name: PROJECTS_COPY.heading,
    description: HOME_COPY.quests,
    icon: "shield",
  },
  {
    id: "chats",
    href: "/chat",
    name: CHAT_COPY.headerLink,
    description: HOME_COPY.chats,
    icon: "flame",
  },
  {
    id: "constructs",
    href: "/constructs",
    name: CONSTRUCTS_COPY.heading,
    description: HOME_COPY.constructs,
    icon: "house",
  },
  {
    id: "activities",
    href: "/activities",
    name: ACTIVITIES_COPY.heading,
    description: HOME_COPY.activities,
    icon: "tools",
  },
  {
    id: "workshop",
    href: "/workshop",
    name: WORKSHOP_COPY.heading,
    description: HOME_COPY.workshop,
    icon: "pencil",
  },
  {
    id: "marketplace",
    href: "/marketplace",
    name: MARKETPLACE_COPY.heading,
    description: HOME_COPY.marketplace,
    icon: "market",
  },
];

// Pages a place holds under another first path segment than its own link's.
const PLACE_ALIASES: ReadonlyMap<string, string> = new Map([
  ["chats", "/chat"],
  ["spellbook", "/workshop"],
]);

// The place a page belongs to, by its path's segments, for the HUD to name.
// Pages that belong to no place, such as Home or Account, have none.
function placeOf(path: readonly string[]): AtlasPlace | undefined {
  const [first = ""] = path;
  const href = PLACE_ALIASES.get(first) ?? `/${first}`;
  return ATLAS_PLACES.find((place) => place.href === href);
}

export { ATLAS_PLACES, placeOf };
