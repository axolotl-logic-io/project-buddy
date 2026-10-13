# Personas

The conventions for these cases are in [the index](README.md#conventions).

## use_case_view_personas

The user looks over the tutor's personas: the built-in ones, and her own.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She goes to her personas.
  - The site lists the built-in personas, then hers.
- **Outcome:** the six built-in personas are listed by name: Hippy, Mr. Tee, Fjord Tines, Span Tines, Argon Sprangler and Roland Dustchain. Under them, her own personas are listed by name, oldest first. With none of her own, the page says she has none yet. Each persona, built-in or her own, offers to clone it. Another user's personas are never listed.
- **Next:**
  - `use_case_clone_persona`: make a persona of her own from one of them.
  - [`use_case_private_data`](accounts.md#use_case_private_data): her personas are hers alone.

## use_case_clone_persona

The user makes a persona of her own by cloning one she can see.

- **Prerequisites:** `use_case_view_personas`.
- **Steps:**
  - She chooses to clone a persona, a built-in one or one of her own.
  - The site makes a new persona of hers from it.
- **Outcome:** her personas list a new one named as the persona she cloned, with " (copy)" after: cloning Hippy gives "Hippy (copy)", and cloning that clone gives "Hippy (copy) (copy)". The persona she cloned is unchanged and still listed. Another user never sees the clone.
- **Next:**
  - `use_case_view_personas`: look over her personas again.
