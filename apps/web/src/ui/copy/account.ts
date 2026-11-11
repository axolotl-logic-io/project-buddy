// Profile, Batteries and security forms in Settings.
export const ACCOUNT_COPY = {
  loading: "Loading your batteries…",
  nameHeading: "Your name",
  nameLabel: "Name",
  nameHint:
    "What your constructs call you. A construct uses your name wherever its instructions say {{name}}. Leave it empty and it says “the user” instead.",
  saveName: "Save",
  nameSaved: "Saved",
  nameMultiLine: "A name is one line. Take out the line break.",
  nameTooLong: (maxLength: number): string =>
    `A name is at most ${maxLength} characters.`,
  nameBraces: "A name can't hold { or }.",
  goldHeading: "Batteries",
  goldHint:
    "What your constructs spend on your replies, images and check-ins. It doesn't reset.",
  signOutHeading: "Signing out",
  signOut: "Sign out",
  signOutEverywhere: "Sign out everywhere",
  signOutEverywhereTitle: "Sign out everywhere?",
  signOutEverywhereDescription:
    "This signs you out in every browser and on every device, this one included. Any sign-in link already sent stops working. You can sign in again with a new link.",
  stay: "Stay signed in",
} as const;
