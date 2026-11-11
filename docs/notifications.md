# Installed app

Project Buddy can be added to a phone's Home Screen. In Chrome on Android,
choose **Install app**. In Safari on iPhone, choose **Add to Home Screen**
from the Share menu, then open the Home Screen icon.

The installed app is the same online site in its own window. The manifest,
icons and appearance metadata provide its name, launch address and colors.
Every launch reaches the site and requires sign-in when the session has ended.
Nothing is cached for offline use.

## Older installations

Notifications have been removed. The site requests no notification permission,
saves no subscriptions and sends no notifications. Subscription tables and old
migrations remain for deployment compatibility; no schema cleanup runs here.

`public/sw.js` remains temporarily at the original worker address so browsers
with an older installation can update it on a later online launch. It activates
immediately, unsubscribes the existing browser subscription and unregisters
itself, including when unsubscribe fails. It handles no notifications, renewal
requests or page fetches. New installations register no worker. Keep this asset
public until a separate compatibility cleanup is approved; devices that have
not returned online may still hold the old worker locally, but the server has
no subscription renewal or delivery path.

Physical Home Screen installation still needs manual device validation; local
component tests cover the manifest, public assets and retirement behavior.
