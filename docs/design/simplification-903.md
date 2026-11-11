# Simplification 903: remove automatic check-ins

Issue [#903](https://github.com/axolotl-logic-io/project-buddy/issues/903) removes automatic quest check-ins. Dailies stays a quest the user continues by hand.

## What goes

- The scheduler: the `crons` entry in `apps/web/vercel.json`, the `/api/check-ins` route, `CRON_SECRET` and its accessor.
- The check-in domain: `src/check-ins/`, `src/conversations/check-in.ts`, the check-in email, the backlog log line, the mock check-in reply and the check-in kickoff.
- The controls: the quest's Check-ins setting, its Server Action, and the `/check-ins/off` unsubscribe page and its proxy exemption.
- Unread marks: a check-in was their only producer, so the mark writes, the reads in quest lists and Today, and the "Unread" badge go.
- Copy, use cases, tests, glossary entries, docs and Library text that describe check-ins or unread quests.

## What stays

- Manual Start the day in Dailies, ordinary replies, stop, retry and battery accounting.
- The installed app and push notifications. Check-ins never sent a push, so nothing here changes them.
- The `check_in_frequency`, `last_check_in_at` columns and the `chat_unreads` table. The live build still reads them, so they stay inert until a separately held cleanup coordinated with the Consolidator drops them.

## Rollout

No migration ships in this change. After release, the old scheduler entry is gone from `vercel.json`, so Vercel stops calling the route. Removing `CRON_SECRET` from Vercel is an operator step after release; with the route deleted, the secret is unused.
