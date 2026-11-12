// The text of the error and not-found pages, and of a chat's failed reply. The
// messages for error cases live in src/errors/app-error.ts, next to the errors
// they describe.
export const PROBLEMS_COPY = {
  errorHeading: "Something went wrong",
  // The error page's message for a failure it doesn't recognise, under the
  // heading, which already says something went wrong.
  unknownError: "Please try again later.",
  retry: "Try again",
  notFoundHeading: "Not found",
  // Any page that isn't found; a missing quest or adventure has the
  // not-found case's own message (src/errors/app-error.ts).
  pageNotFound:
    "That page can't be found. The link may be wrong, or it may have been deleted.",
  questsLink: "Quests",
  signInLink: "Sign in again",
} as const;
