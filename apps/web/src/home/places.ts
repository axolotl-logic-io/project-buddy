import type { ComponentProps } from "react";
import type { Icon } from "@/components/ui/icon.tsx";
import { ACTIVITIES_COPY } from "@/ui/copy/activities.ts";
import { BUDDIES_COPY } from "@/ui/copy/buddies.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { GENERATION_COPY } from "@/ui/copy/generation.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";
import { MARKETPLACE_COPY } from "@/ui/copy/marketplace.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";
import { WORKSHOP_COPY } from "@/ui/copy/workshop.ts";

interface AtlasPlace {
  readonly id: string;
  readonly href: string;
  readonly name: string;
  readonly description: string;
  readonly icon: ComponentProps<typeof Icon>["name"];
  // Where its marker sits on the artwork, in percent of the map's width
  // and height. The trails read it; page-roles.css places the marker at the
  // same point (places.test.ts checks they agree).
  readonly at: { readonly x: number; readonly y: number };
}

// One set of destinations for the map and its reading-order list. Position
// is decoration; it never changes the order reached with the keyboard.
const ATLAS_PLACES: readonly AtlasPlace[] = [
  {
    id: "quests",
    at: { x: 36, y: 34 },
    href: "/projects",
    name: PROJECTS_COPY.heading,
    description: HOME_COPY.quests,
    icon: "shield",
  },
  {
    id: "chats",
    at: { x: 52, y: 48 },
    href: "/chat",
    name: CHAT_COPY.headerLink,
    description: HOME_COPY.chats,
    icon: "flame",
  },
  {
    id: "buddies",
    at: { x: 15, y: 46 },
    href: "/buddies",
    name: BUDDIES_COPY.heading,
    description: HOME_COPY.buddies,
    icon: "house",
  },
  {
    id: "activities",
    at: { x: 80, y: 52 },
    href: "/activities",
    name: ACTIVITIES_COPY.heading,
    description: HOME_COPY.activities,
    icon: "tools",
  },
  {
    id: "spellbook",
    at: { x: 82, y: 28 },
    href: "/spellbook",
    name: SPELLBOOK_COPY.heading,
    description: HOME_COPY.spellbook,
    icon: "book",
  },
  {
    id: "workshop",
    at: { x: 66, y: 64 },
    href: "/workshop",
    name: WORKSHOP_COPY.heading,
    description: HOME_COPY.workshop,
    icon: "pencil",
  },
  {
    id: "gallery",
    at: { x: 30, y: 58 },
    href: "/gallery",
    name: GENERATION_COPY.heading,
    description: HOME_COPY.gallery,
    icon: "image",
  },
  {
    id: "marketplace",
    at: { x: 58, y: 22 },
    href: "/marketplace",
    name: MARKETPLACE_COPY.heading,
    description: HOME_COPY.marketplace,
    icon: "market",
  },
  {
    id: "settings",
    at: { x: 11, y: 30 },
    href: "/settings",
    name: SETTINGS_COPY.heading,
    description: HOME_COPY.settings,
    icon: "gear",
  },
];

// The dotted trails drawn between places on the map, as pairs of place ids.
// Like position, they are decoration only.
const ATLAS_TRAILS: readonly (readonly [string, string])[] = [
  ["quests", "marketplace"],
  ["marketplace", "spellbook"],
  ["quests", "chats"],
  ["chats", "activities"],
  ["chats", "workshop"],
  ["workshop", "activities"],
  ["quests", "buddies"],
  ["buddies", "gallery"],
  ["gallery", "chats"],
  ["buddies", "settings"],
];

// Pages a place holds under another first path segment than its own link's.
const PLACE_ALIASES: ReadonlyMap<string, string> = new Map([
  ["chats", "/chat"],
]);

// The place a page belongs to, by its path's segments, for the HUD to name.
// Pages that belong to no place, such as Home or Account, have none.
function placeOf(path: readonly string[]): AtlasPlace | undefined {
  const [first = ""] = path;
  const href = PLACE_ALIASES.get(first) ?? `/${first}`;
  return ATLAS_PLACES.find((place) => place.href === href);
}

export { ATLAS_PLACES, ATLAS_TRAILS, placeOf };
