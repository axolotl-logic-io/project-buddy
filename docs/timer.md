# Timer

The Timer helps a user work and rest on a repeating schedule, alone or alongside others who open the same link. Its terms are in the [glossary](../GLOSSARY.md#timer), and its use cases are in [Timer use cases](../apps/web/use-cases/timer.md).

## Setup

**Timer** in the site panel's Places opens `/timer`. Anyone may open `/timer` and every timer link without signing in. Two selectors, **Work for** and **Break for**, each offer 10, 15, 25, 30, 45, 50, 60 and 120 minutes. A browser tab that has shown no timer offers 50 and 10 minutes; otherwise it offers the lengths of the timer it showed last. The tab's session storage keeps them, so another tab or device starts from the defaults.

Setup has two actions:

- **Start** opens a new schedule that begins now, with work.
- **Join global timer** opens the schedule that starts at the Unix epoch. Everyone who chooses the same lengths joins the same schedule, often partway through a period.

## Quest sidebar

Open the Timer with the right sidebar button in a quest. Select Work for and Break for, then choose Start. The countdown and phase appear in the panel. You can keep working in the quest's sections while the schedule continues. The panel uses the same presets, phase calculation and appearance as the Timer page. On phones it opens as a drawer. Closing the panel keeps the countdown running while the quest page stays open.

## Timer links

A running timer's address is its whole schedule:

```text
/timer/WORK/BREAK/START
/timer/25/15/1763197200000   25 minutes of work, 15 of break, from 2025-11-15 09:00 UTC
/timer/50/10/0               the global 50/10 timer
```

`WORK` and `BREAK` must be preset lengths. `START` is whole milliseconds since the Unix epoch. A start up to one minute ahead of the viewer's clock counts as now, to allow for clocks that disagree a little. A link with any other value, or a start further ahead, shows **This isn't a timer link** and a way back to setup, with no countdown.

The link holds no quest, conversation or account data, so the proxy (`src/proxy.ts`) lets `/timer` and every path under it through without a session. A signed-out visitor sees the same timer, its trail and **Copy link**. Every other signed-out page still leads to sign-in.

## Running timer

The page shows an hourglass or dial on the site’s own texture, the period's name, **Work** or **Break**, and the time left as `MM:SS`, or `HH:MM:SS` from an hour. The illustration is decoration; the name and time say everything in text. The countdown has the `timer` role, so screen readers don't read every second. A hidden status line announces the period's name as each one begins.

The browser's clock decides the period: `src/timer/schedule.ts` works it out from the time since the start. The page reads the clock at each second the countdown shows and whenever its tab comes back into view. A tab that slept therefore shows the current period at once and replays nothing. Two devices agree when their clocks do; the site doesn't synchronize clocks.

The bar with the page's trail, **Timer › Work 25 · Break 15**, holds the count of others following the schedule. **Timer preferences** at its right opens a sidebar with **Copy link**. **Copy link** copies the page's address and briefly reads **Copied**, or **Copy failed** when the browser refuses. A hidden status line says the same to a screen reader. **Timer** in the trail leads back to setup. A link whose start is still ahead of the server's clock shows neither the count nor **Copy link**.

The timer writes no message, completes no task, records no milestone, sends no notification and makes no model request.

## Timer appearance preferences

The Timer follows the site's saved appearance. Each site appearance has a paired timer illustration:

- **Ivory Vellum**: a scribe's hourglass with golden sand.
- **Soot & Brass**: a Gothic hour dial.
- **Espresso Leather**: a necromantic seal with a blackletter phase label.

The illustration is transparent over the page's existing texture and is live SVG styled by semantic CSS tokens. It adds no second paper surface, repeated site title or schedule caption. The countdown uses lining, tabular numerals, with the phase above it.

In Ivory Vellum, sand drains from the upper bowl to the lower bowl as the period passes. In the two darker appearances, twelve markers fill clockwise as the elapsed arc passes them. Both follow the schedule rather than a separate animation, so returning to a sleeping tab shows the current state immediately. Each new work or break period resets the illustration. Motion respects reduced-motion settings.

The right sidebar mirrors the site's left panel: it docks over the page on wide screens, remembers whether it is docked, and opens as a modal drawer on phones. Escape closes a phone drawer and restores focus to its button; keyboard focus stays within the open drawer. Signed-out visitors have the same copy control. Setup also offers preferences; **Copy link** appears only for a running timer.

Appearance swatches are available in the left site panel and Settings, rather than the timer sidebar. Selecting one restyles both the page and the timer immediately, and saves the site's theme cookie. There is no separate timer choice. The schedule and shared link stay unchanged.

## Others following

An open timer calls `reportTimerPresenceAction` as it opens, every minute and when its tab comes back into view. The `timer_presence` table keeps one row per account and schedule with the time of its last report. The answer counts the other accounts whose last report on the exact schedule is at most 2 minutes old, so several tabs of one account count once. Each report also deletes every row older than that.

Presence belongs to accounts, so a signed-out visitor's timer makes no report and shows no count; the action itself still requires a session.

The trail shows the count as **3 others here**, or **Unknown others** when a report fails. It shows nothing until the first report answers. It never shows a stale count or a made-up zero, and the countdown never waits for a report. The next report that succeeds shows the count again.
