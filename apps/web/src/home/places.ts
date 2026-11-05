import type { ComponentProps } from "react";
import type { Icon } from "@/components/ui/icon.tsx";
import { ACTIVITIES_COPY } from "@/ui/copy/activities.ts";
import { BUDDIES_COPY } from "@/ui/copy/buddies.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { GENERATION_COPY } from "@/ui/copy/generation.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";
import { MARKETPLACE_COPY } from "@/ui/copy/marketplace.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { SPELLBOOK_COPY } from "@/ui/copy/spells.ts";

interface AtlasPlace {
  readonly id: string;
  readonly href: string;
  readonly name: string;
  readonly description: string;
  readonly icon: ComponentProps<typeof Icon>["name"];
}

// One set of destinations for the map and its reading-order list. Position
// is decoration; it never changes the order reached with the keyboard.
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
    id: "buddies",
    href: "/buddies",
    name: BUDDIES_COPY.heading,
    description: HOME_COPY.buddies,
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
    id: "spellbook",
    href: "/spellbook",
    name: SPELLBOOK_COPY.heading,
    description: HOME_COPY.spellbook,
    icon: "book",
  },
  {
    id: "gallery",
    href: "/gallery",
    name: GENERATION_COPY.heading,
    description: HOME_COPY.gallery,
    icon: "image",
  },
  {
    id: "marketplace",
    href: "/marketplace",
    name: MARKETPLACE_COPY.heading,
    description: HOME_COPY.marketplace,
    icon: "market",
  },
];

export { ATLAS_PLACES };
