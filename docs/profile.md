# Profile visiting days

Profile shows the user's private [Days signed in](../GLOSSARY.md#days-signed-in) total in a separate card between Experience and Abilities. The card gives the total, its first tracked date and the UTC day rule. One date says **1 day total**; other totals say **days total**. This total grants no ability points or experience and measures neither a Dailies Start Day nor a streak. See [`use_case_days_signed_in`](../apps/web/use-cases/profile.md#use_case_days_signed_in).

## Counting dates

Each UTC calendar date with a qualifying signed-in visit counts once across sessions, tabs and devices. A day starts at 00:00 UTC, regardless of the browser's time zone or daylight-saving changes. Visits just before and after midnight can count as two dates; elapsed 24-hour periods are not used. Dailies keeps its separate browser-local date rule and server UTC fallback. Accounts have no stored time zone, so visiting days use that UTC fallback consistently across devices.

A visible page entry, navigation or return to a tab qualifies, including with an existing session. If the user keeps a page open across midnight, their next foreground pointer or keyboard interaction qualifies for the next date. An idle page alone does not add dates. Recording requires the page’s browser script to run; fetching HTML alone does not qualify. Signed-out visits, failed sign-ins, expired or revoked sessions, page prefetches, server renders, conversation refresh polling and Timer presence reports create no visiting dates.

## Tracking start

Tracking begins with the user's first qualifying visit. No earlier dates are inferred from account creation, quests, Tasks, messages or Dailies. Before the first successful report, the card shows zero and explains that tracking starts with the first signed-in visit. A successful new-date report refreshes the page to show the saved total. A failed report can retry at the next qualifying event; it creates no invented count.

## Recording and storage

The browser reports visible visits to a Server Action. The action checks the session again and derives both the account and the date on the server; it accepts neither from the client. The client skips repeat reports for a date it already sent, which only reduces traffic. A unique account and date constraint in the database makes concurrent reports from several devices idempotent.

Account and session reads never record a visit. Rows survive sign-out and deployments and are removed with the account. Quest membership grants no access to another account's visiting dates.
