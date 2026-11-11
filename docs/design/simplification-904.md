# Removing Extras (#904)

This page records what issue #904 removes. Extras were optional parts of a page that the user could hide from the Settings page. After this change, every user sees one interface: the content that Extras showed by default stays, and no saved choice can hide it.

## What the user gets

- Working notes, Journal and Plan change cards, tool lines, the pinned chat header, the page decoration and the battery balance always show.
- Settings keeps Appearance (Light, Dark and System) and has no Extras section.
- An old `hidden-extras` cookie or a saved `users.hidden_extras` value has no effect.

## Removed

- `src/flags/`: the flag list, `extraTag`, the `hide` cascade layer (`extras.css`), the cookie and pre-paint script, `useHiddenFlags`, the switch and its Server Action, and the sign-in cookie seed.
- The Settings Extras section (`flag-switches.tsx`) and its copy.
- The `data-hide` attribute on `<html>`, every `data-extra` tag, and the page decoration's hide rule in `contract.css`.
- `saveHiddenExtras` and every read of `hiddenExtras` in the account and sign-in stores.
- The flag tests and fixtures: `flags.test.ts`, `hide-extras.*`, `settings-follow-user.server.test.ts`, `flag-switches.browser.test.tsx`, and the Extras parts of other tests.
- The project-practices rules about adding an extra and the `extras` cascade layer, and the glossary's Extra entry.

## Retained compatibility

- The `users.hidden_extras` column stays in the table definition, inert, because the live build reads and writes it. Dropping it belongs in a separate held cleanup, coordinated with the Consolidator, after this change is live in production.
- Browsers may keep an old `hidden-extras` cookie until it expires. Nothing reads it.

No new persistent state comes from this change.
