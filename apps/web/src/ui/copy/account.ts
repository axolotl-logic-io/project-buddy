// The name form in Profile, and the security forms in Settings.
export const ACCOUNT_COPY = {
  loading: "Loading Settings…",
  nameHeading: "Your name",
  nameLabel: "Name",
  nameHint:
    "Used by {{name}} in spell replies. People in quests you share see it beside your messages and in Members.",
  saveName: "Save",
  nameRequired: "Enter your name.",
  nameSaved: "Saved",
  nameMultiLine: "A name is one line. Take out the line break.",
  nameTooLong: (maxLength: number): string =>
    `A name is at most ${maxLength} characters.`,
  nameBraces: "A name can't hold { or }.",
  signOut: "Sign out",
  signOutEverywhere: "Sign out everywhere",
  signOutEverywhereTitle: "Sign out everywhere?",
  signOutEverywhereDescription:
    "This signs you out in every browser and on every device, this one included. Sign-in links and quest invitation links already sent stop working. Your invitations stay in Pending, and you can sign in again with a new link.",
  stay: "Stay signed in",
} as const;
