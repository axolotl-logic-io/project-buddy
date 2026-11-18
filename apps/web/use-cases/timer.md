# Timer

The conventions for these cases are in [the index](README.md#conventions). The Timer is a destination of its own in the site panel's Places, apart from every quest. A timer repeats a work period and a break period forever from a fixed start. Its link holds only the durations and the start, so following it reaches no quest, conversation, Tasks or Quick Notes. Anyone may open the Timer and its links without signing in.

## use_case_timer_start

- **Intent:** Work for a chosen length of time and then take a break.
- **Prerequisites:** none. They need not be signed in.
- **Steps:**
  - They open Timer from the site panel, or open `/timer` when signed out.
  - They choose how long to work for and how long to break for, and choose Start.
- **Outcome:** each length is one of 10, 15, 25, 30, 45, 50, 60 or 120 minutes; a tab that has shown no timer offers 50 minutes of work and 10 of break. Start opens the new timer's link. It begins with work and its whole length left. An hourglass drains in Ivory Vellum; a large ring fills in the darker appearances. The period's name, Work or Break, and the time left, as MM:SS or from an hour HH:MM:SS, accompany the illustration. The timer moves between work and break by itself.
- **Next:**
  - [`use_case_timer_follow_cycle`](#use_case_timer_follow_cycle): work and rest by the timer.
  - [`use_case_timer_join_link`](#use_case_timer_join_link): share the page's link so someone else follows the same schedule.

## use_case_timer_join_link

- **Intent:** Follow the same work and break schedule as someone else.
- **Prerequisites:** someone shared a timer's link with them ([`use_case_timer_start`](#use_case_timer_start) or [`use_case_timer_join_global`](#use_case_timer_join_global)).
- **Steps:**
  - They open the link, at any time after the timer began, signed in or not.
- **Outcome:** they see the schedule's current period and the time left of it, not a new countdown, and refreshing keeps the same schedule. A signed-out visitor sees the same timer and Copy link in Timer preferences, with no sign-in first. A link that doesn't name a timer, such as one with a missing, zero, negative or other length than the presets, or a start more than a minute ahead of their clock, says so and offers the way to set up a timer, with no countdown. Opening a link changes no one else's timer.
- **Next:**
  - [`use_case_timer_follow_cycle`](#use_case_timer_follow_cycle): follow the cycle.
  - [`use_case_timer_return_to_setup`](#use_case_timer_return_to_setup): leave it for another schedule.

## use_case_timer_join_global

- **Intent:** Join a common schedule without arranging a start time.
- **Prerequisites:** the user is signed in ([`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link)).
- **Steps:**
  - They open Timer, choose the lengths and choose Join global timer.
- **Outcome:** they join the schedule that everyone choosing the same lengths shares, which started at the Unix epoch, so they may join partway through work or a break. The setup page explains this beside the button. Joining restarts nothing, and different lengths make a different global schedule.
- **Next:**
  - [`use_case_timer_see_others`](#use_case_timer_see_others): see who else follows it.

## use_case_timer_follow_cycle

- **Intent:** Know when to work and when to rest with as little attention as possible.
- **Prerequisites:** [`use_case_timer_start`](#use_case_timer_start), [`use_case_timer_join_link`](#use_case_timer_join_link) or [`use_case_timer_join_global`](#use_case_timer_join_global).
- **Steps:**
  - They read the period and the countdown, and may leave the tab in the background or let the device sleep, then come back.
- **Outcome:** at exactly the end of work the timer shows Break with the whole break left, and at exactly the end of the break Work with the whole work period left; the ring starts empty or the hourglass resets with a full upper bowl each time. Coming back after missed periods shows the current period and time left at once, without replaying the ones missed. A screen reader hears the period's name as each one begins, not every second. The timer writes no message, completes no step, records no milestone, sends no notification and makes no model request.
- **Next:**
  - [`use_case_timer_return_to_setup`](#use_case_timer_return_to_setup): change the timer.

## use_case_timer_see_others

- **Intent:** Know that others are following the same schedule.
- **Prerequisites:** an open timer ([`use_case_timer_start`](#use_case_timer_start), [`use_case_timer_join_link`](#use_case_timer_join_link) or [`use_case_timer_join_global`](#use_case_timer_join_global)), opened while signed in.
- **Steps:**
  - They read the count, such as 3 others here, at the right of the bar with the page's trail.
- **Outcome:** the count is of other signed-in accounts that had this exact schedule open in the last 2 minutes. A signed-out visitor is not counted and sees no count. An open timer reports every minute and as its tab comes back into view. An account counts once however many tabs or devices it has open, and the user never counts themselves. The count names no one and shows no quest. When a report fails the count says it is unavailable, never a stale number or a made-up zero, and the timer keeps running; the next report that succeeds shows the count again.
- **Next:**
  - [`use_case_timer_join_link`](#use_case_timer_join_link): share the link with someone else.

## use_case_timer_return_to_setup

- **Intent:** Leave a timer and choose another schedule.
- **Prerequisites:** an open timer.
- **Steps:**
  - They choose Timer in the page's trail, or Timer in the site panel.
  - They may change the lengths and start again.
- **Outcome:** setup offers the lengths of the timer last shown in this browser tab; another tab or device offers its own. A new Start makes a new schedule with a new link. Links already shared, and other people's timers, are unchanged.
- **Next:**
  - [`use_case_timer_start`](#use_case_timer_start) or [`use_case_timer_join_global`](#use_case_timer_join_global): begin another timer.

## use_case_timer_choose_appearance

- **Intent:** Choose a site appearance and its paired timer illustration without changing the timer schedule.
- **Prerequisites:** the Timer is open, signed in or not.
- **Steps:**
  - They open the left site panel.
  - They choose Ivory Vellum, Soot & Brass or Espresso Leather.
- **Outcome:** the site and timer change appearance together immediately, using the same preference as the left panel and Settings. The browser remembers the site appearance across timer links and reloads. Ivory Vellum uses the scribe’s hourglass, with the countdown beside it on desktop and below it on phones; the darker appearances retain their dials. The schedule and shared link stay unchanged. On phones, the site panel opens as a modal drawer with keyboard focus kept inside; Escape closes it and returns focus to the opening button. On wide screens it docks on the left and remembers whether it is open.

## use_case_timer_copy_link

- **Intent:** Share the current schedule.
- **Prerequisites:** a running timer is open, signed in or not.
- **Steps:**
  - They open Timer preferences and choose Copy link.
- **Outcome:** the current address is copied. The button briefly reads Copied or Copy failed, with the same result announced to a screen reader. A failed copy leaves the countdown running.

## use_case_timer_quest_panel

- **Steps:** Open the Timer panel on a quest. Set Work for and Break for, then choose Start.
- **Outcome:** The phase and countdown run in the same panel, using the site's selected appearance and the Timer page's schedule rules. On a phone the panel opens as a drawer. The Timer works with or without an active spell.
