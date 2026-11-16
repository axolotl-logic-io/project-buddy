# Timer

The Timer helps a user work and rest on a repeating schedule, alone or alongside others who open the same link. Its terms are in the [glossary](../GLOSSARY.md#timer), and its use cases are in [Timer use cases](../apps/web/use-cases/timer.md). It brings the user-facing behaviour of [Axolotl Time](https://github.com/axolotl-logic-io/axolotl-time) into Project Buddy.

## Setup

**Timer** in the site menu's Places opens `/timer`. Two selectors, **Work for** and **Break for**, each offer 10, 15, 25, 30, 45, 50, 60 and 120 minutes. A browser tab that has shown no timer offers 50 and 10 minutes; otherwise it offers the lengths of the timer it showed last. The tab's session storage keeps them, so another tab or device starts from the defaults.

Setup has two actions:

- **Start** opens a new schedule that begins now, with work.
- **Join global timer** opens the schedule that starts at the Unix epoch. Everyone who chooses the same lengths joins the same schedule, often partway through a period.

## Timer links

A running timer's address is its whole schedule:

```text
/timer/WORK/BREAK/START
/timer/25/15/1763197200000   25 minutes of work, 15 of break, from 2025-11-15 09:00 UTC
/timer/50/10/0               the global 50/10 timer
```

`WORK` and `BREAK` must be preset lengths. `START` is whole milliseconds since the Unix epoch. A start up to one minute ahead of the viewer's clock counts as now, to allow for clocks that disagree a little. A link with any other value, or a start further ahead, shows **This isn't a timer link** and a way back to setup, with no countdown.

The link holds no quest, conversation or account data. A signed-out visitor who opens one is sent to `/login?next=PATH`, and the sign-in link emailed from there leads back to the timer. Every other signed-out page still leads home after sign-in. A visitor with no account who signs up lands on Quests and opens the link again.

## Running timer

The page shows a ring that fills as the period passes, the period's name, **Work** or **Break**, and the time left as `MM:SS`, or `HH:MM:SS` from an hour. The ring is decoration; the name and time say everything in text. The countdown has the `timer` role, so screen readers don't read every second. A hidden status line announces the period's name as each one begins.

The browser's clock decides the period: `src/timer/schedule.ts` works it out from the time since the start. The page reads the clock at each second the countdown shows and whenever its tab comes back into view. A tab that slept therefore shows the current period at once and replays nothing. Two devices agree when their clocks do; the site doesn't synchronize clocks.

The timer writes no message, completes no task, records no milestone, sends no notification and makes no model request.

## Others following

An open timer calls `reportTimerPresenceAction` as it opens, every minute and when its tab comes back into view. The `timer_presence` table keeps one row per account and schedule with the time of its last report. The answer counts the other accounts whose last report on the exact schedule is at most 2 minutes old, so several tabs of one account count once. Each report also deletes every row older than that.

The page shows the count, or **The count of others is unavailable right now** when a report fails. It never shows a stale count or a made-up zero, and the countdown never waits for a report. The next report that succeeds shows the count again.

## Code

| Module | Holds |
| --- | --- |
| `src/timer/schedule.ts` | Presets, link parsing, phase arithmetic and the countdown's format |
| `src/timer/presence.ts` | Report interval, expiry and the count's shape |
| `src/timer/presence-store.ts` | The `timer_presence` table's reads and writes |
| `src/timer/presence-action.ts` | The Server Action the running timer calls |
| `src/components/timer/` | Setup, the running timer and the tab's remembered lengths |
