import type { JSX } from "react";
import type { OwnBuddyChoice } from "@/buddies/buddy-store.ts";
import {
  type BuddyId,
  DEFAULT_BUDDY_ID,
  listBuddies,
} from "@/buddies/index.ts";
import { RadioCardGroup } from "@/components/ui/radio-card-group.tsx";
import type { UserBuddyId } from "@/ids.ts";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";

const BUDDY_OPTIONS = listBuddies().map((buddy) => ({
  value: buddy.id,
  label: buddy.name,
}));

const NO_USER_BUDDIES: readonly OwnBuddyChoice[] = [];

// A form's choice of buddy, sent as `buddyId`: the built-in buddies,
// then any of the user's own given, with defaultBuddyId, or else the
// default buddy, chosen to start with.
function BuddyPicker({
  defaultBuddyId = DEFAULT_BUDDY_ID,
  userBuddies = NO_USER_BUDDIES,
  label = NEW_CHAT_COPY.buddyLabel,
}: {
  readonly defaultBuddyId?: BuddyId | UserBuddyId;
  readonly userBuddies?: readonly OwnBuddyChoice[];
  readonly label?: string;
}): JSX.Element {
  return (
    <RadioCardGroup
      defaultValue={defaultBuddyId}
      label={label}
      name="buddyId"
      options={[
        ...BUDDY_OPTIONS,
        ...userBuddies.map(({ id, name }) => ({ value: id, label: name })),
      ]}
    />
  );
}

export { BuddyPicker };
