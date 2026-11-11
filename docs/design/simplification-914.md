# Installed app without notifications

Remove notification settings, subscription and renewal endpoints, delivery code,
VAPID configuration and notification dependencies. Keep the installed app manifest,
icons and online Home Screen launches.

Retire existing service workers at their original URL. The retirement worker must
unsubscribe the existing device and unregister itself without subscribing, sending
notifications or changing navigation. Keep subscription schema and historical
migrations inert; this change makes no destructive migration.

Sign-out and sign-out-everywhere must continue to delete sessions. Remove only
notification cleanup from authentication. Check-ins are removed by #903; coordinate
that dependency and the Settings consolidation in #918 before review.
