# Site upkeep

The conventions for these cases are in [the index](README.md#conventions).

## use_case_see_manual_credit

The user sees credit given to the Blender manual.

- **Prerequisites:** none.
- **Steps:**
  - She looks at the bottom of any page, including the sign-in page.
  - She follows the Credits link.
  - The Credits page credits the Blender Reference Manual and its CC BY-SA 4.0 license, with links to both.
- **Outcome:** every page, signed in or not, including the sign-in page and the not-found page, ends with a Credits link. The Credits page is accessible signed in or out and links to the Blender Reference Manual and to the CC BY-SA 4.0 license.
- **Next:** none.

## use_case_update_manual

The buddy's copy of the manual is updated when a new stable Blender release ships.

- **Prerequisites:** a new stable Blender release exists.
- **Steps:**
  - She points the site at the new release and runs one command to rebuild the buddy's copy of the manual.
  - The buddy's copy is replaced in one go, so answers never mix two releases.
- **Outcome:** the buddy finds sections that are new in the release, and its links lead to the matching pages of the manual. If the command fails partway, the buddy still answers from the old copy, with nothing from the new release mixed in. Running the command again gives the same result.
- **Next:**
  - [`use_case_ask_blender_question`](chats.md#use_case_ask_blender_question): ask about something new in the release.

## use_case_keep_data_through_update

Everything the user saved is still there after a site update that renames how it is stored.

- **Prerequisites:**
  - [`use_case_customize_buddy`](buddies.md#use_case_customize_buddy): she has a buddy of her own.
- **Steps:**
  - She has buddies of her own and chats, each started with a buddy.
  - The site is updated, and the update renames where buddies and chats' buddies are stored.
  - She comes back to the site.
- **Outcome:** every buddy of hers has the same name, parts and origin as before, and every chat keeps the buddy it was started with, as it was when the chat started.
- **Next:**
  - [`use_case_switch_buddy`](chats.md#use_case_switch_buddy): carry on chatting with her buddies.
