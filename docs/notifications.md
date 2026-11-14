# Installed app

Project Buddy can be added to a phone's Home Screen. In Chrome on Android,
choose **Install app**. In Safari on iPhone, choose **Add to Home Screen**
from the Share menu, then open the Home Screen icon.

The installed app is the same online site in its own window. The manifest,
icons and appearance metadata provide its name, launch address and colors.
Every launch reaches the site and requires sign-in when the session has ended.
Nothing is cached for offline use.

The site registers no service worker, requests no notification permission
and sends no notifications.

Physical Home Screen installation still needs manual device validation; local
component tests cover the manifest and public assets.
