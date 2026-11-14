// Profile and security forms in Settings.
export const ACCOUNT_COPY = {
  loading: "Loading Settings…",
  nameHeading: "Your name",
  nameLabel: "Name",
  nameHint: "Used by {{name}} in spell replies.",
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
    "This signs you out in every browser and on every device, this one included. Any sign-in link already sent stops working. You can sign in again with a new link.",
  stay: "Stay signed in",
} as const;
