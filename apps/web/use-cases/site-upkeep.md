# Site upkeep

The conventions for these cases are in [the index](README.md#conventions).

## use_case_see_icon_credit

The user sees credit given to Lucide place icons.

- **Prerequisites:** none.
- **Steps:**
  - She opens the menu on any page, including the sign-in page.
  - She follows the Credits link.
  - The Credits page credits Lucide place icons and links to their ISC License notice.
- **Outcome:** every page offers Credits, signed in or out. Credits links to Lucide and its ISC License notice.
- **Next:** none.

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
  - [`use_case_continue_chat`](chats.md#use_case_continue_chat): carry on talking with her constructs.
