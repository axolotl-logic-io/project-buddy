# Site upkeep

The conventions for these cases are in [the index](README.md#conventions).

## use_case_see_manual_credit

The user sees credit given to the Blender manual.

- **Prerequisites:** none.
- **Steps:**
  - She opens the menu on any page, including the sign-in page.
  - She follows the Credits link.
  - The Credits page credits Lucide place icons and links to their ISC License notice.
  - The Credits page credits the Blender Reference Manual and its CC BY-SA 4.0 license, with links to both.
- **Outcome:** every page, signed in or not, including the sign-in page and the not-found page, offers a Credits link in the menu. The Credits page is accessible signed in or out and links to the Blender Reference Manual and to the CC BY-SA 4.0 license.
- **Next:** none.

## use_case_update_manual

The construct's copy of the manual is updated when a new stable Blender release ships.

- **Prerequisites:** a new stable Blender release exists.
- **Steps:**
  - She points the site at the new release and runs one command to rebuild the construct's copy of the manual.
  - The construct's copy is replaced in one go, so answers never mix two releases.
- **Outcome:** the construct finds sections that are new in the release, and its links lead to the matching pages of the manual. If the command fails partway, the construct still answers from the old copy, with nothing from the new release mixed in. Running the command again gives the same result.
- **Next:**
  - [`use_case_ask_blender_question`](chats.md#use_case_ask_blender_question): ask about something new in the release.

## use_case_keep_data_through_update

Everything the user saved is still there after a site update that renames how it is stored.

- **Prerequisites:**
  - [`use_case_customize_construct`](constructs.md#use_case_customize_construct): she has a construct of her own.
- **Steps:**
  - She has constructs of her own and adventures, each started with a construct.
  - The site is updated, and the update renames where constructs and adventures' constructs are stored.
  - She comes back to the site.
- **Outcome:** every construct of hers has the same name, parts and origin as before, and every adventure keeps the construct it was started with, as it was when the adventure started.
- **Next:**
  - [`use_case_switch_construct`](chats.md#use_case_switch_construct): carry on chatting with her constructs.
