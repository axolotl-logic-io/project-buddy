# Activities as internal instructions (#905)

This note records how #905 removes Activities as a place the user goes to and a choice the user makes. Activities stay as internal instructions that the construct follows and changes with its activity tool. Paths are relative to `apps/web/`.

## What goes

- The Activities page (`/activities`) and its menu, Home and breadcrumb links. The old address redirects to the Workshop's Activities tab and makes nothing.
- Every activity start action: the start dialog on an activity card and on an activity's own page.
- The hidden activity field in the quest start form and the activity preset of a start point. The server picks the activity from the chosen starting point (Dailies, Learn a thing, Make a thing or Do a thing).
- The activity list in the quest start choices, which no form shows any more.
- Copy, Library text, use cases and tests that describe the removed places and actions.

## What stays

- Built-in and own activities, their instructions and opening requests, and the snapshot each conversation saves.
- The construct's `select_activity` tool and the activity list in its instructions.
- Private activity editing: the Workshop's Activities tab lists them, and each opens in its editor at `/activities/ACTIVITY_ID`.
- Construct start actions, which open the shared four-choice quest start.

## Rollout compatibility

There is no schema change. A quest start form from the earlier build may still send an `activityId`; the new action ignores it and uses the starting point's activity.
