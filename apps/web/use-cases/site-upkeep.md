# Site upkeep

The conventions for these cases are in [the index](README.md#conventions).

## use_case_see_manual_credit

The user sees credit given to the Blender manual.

- **Prerequisites:** none.
- **Steps:**
  - She looks at the bottom of any page, including the sign-in page.
  - It credits the Blender Reference Manual and its CC BY-SA 4.0 license, with links to both.
- **Outcome:** every page, signed in or not, including the sign-in page and the not-found page, ends with the credit. It links to the Blender Reference Manual and to the CC BY-SA 4.0 license.
- **Next:** none.

## use_case_update_manual

The tutor's copy of the manual is updated when a new stable Blender release ships.

- **Prerequisites:** a new stable Blender release exists.
- **Steps:**
  - She points the site at the new release and runs one command to rebuild the tutor's copy of the manual.
  - The tutor's copy is replaced in one go, so answers never mix two releases.
- **Outcome:** the tutor finds sections that are new in the release, and its links lead to the matching pages of the manual. If the command fails partway, the tutor still answers from the old copy, with nothing from the new release mixed in. Running the command again gives the same result.
- **Next:**
  - [`use_case_ask_blender_question`](chats.md#use_case_ask_blender_question): ask about something new in the release.
