# Profile

## use_case_days_signed_in

- **Intent:** See how many distinct days they have visited while signed in.
- **Prerequisites:** a signed-in user.
- **Steps:**
  - They visit a visible page and open Profile.
  - They visit again on the same UTC date, including in other tabs or devices.
  - They return on another UTC date with their existing session.
- **Outcome:** Profile shows their private Days signed in total in its own card between Experience and Abilities, using singular or plural wording, with the first tracked date and the UTC rule. A UTC date counts once across tabs, devices and sessions. The next date counts without another sign-in. Foreground interaction after midnight qualifies; leaving an idle page open does not. Signed-out visits, failed sign-ins, prefetches and background polling create no dates. Tracking begins with the first qualifying visit after release; earlier dates are not inferred. The total survives sign-out and deployments, is isolated from other accounts regardless of quest membership, and adds no experience or ability points or Dailies/streak activity.
