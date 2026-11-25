// The name form in Profile, the time zone field at sign-up and in Settings,
// and the security forms in Settings.
export const ACCOUNT_COPY = {
  loading: "Loading Settings…",
  nameLabel: "Name",
  nameHint:
    "Used by {user} in rite replies. People in quests you share see it beside your messages and in Members.",
  saveName: "Save",
  rename: "Rename",
  cancelRename: "Cancel",
  nameRequired: "Enter your name.",
  nameSaved: "Saved",
  nameMultiLine: "A name is one line. Take out the line break.",
  nameTooLong: (maxLength: number): string =>
    `A name is at most ${maxLength} characters.`,
  nameBraces: "A name can't hold { or }.",
  timeZoneHeading: "Time zone",
  timeZoneLabel: "Time zone",
  timeZoneHint:
    "Each day starts at midnight here. Daily tasks become unchecked for the new day, weekly tasks on Monday and monthly tasks on the 1st.",
  saveTimeZone: "Save time zone",
  timeZoneSaved: "Time zone saved",
  timeZoneUnknown: "Choose a time zone from the list.",
  signOut: "Sign out",
  signOutEverywhere: "Sign out everywhere",
  signOutEverywhereTitle: "Sign out everywhere?",
  signOutEverywhereDescription:
    "This signs you out in every browser and on every device, this one included. Sign-in links and quest invitation links already sent stop working. Your invitations stay on Quests, and you can sign in again with a new link.",
  stay: "Stay signed in",
} as const;
