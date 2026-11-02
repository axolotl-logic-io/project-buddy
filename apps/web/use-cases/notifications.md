# Installed app and notifications

The conventions for these cases are in [the index](README.md#conventions).

## use_case_install_app

The user puts Project Buddy on her phone's Home Screen and opens it like an app.

- **Prerequisites:** none.
- **Steps:**
  - She opens the site on her phone: in Chrome on Android, or in Safari on an iPhone.
  - She installs it: **Install app** in Chrome's menu, or **Add to Home Screen** in Safari's Share menu.
  - She opens Project Buddy from its icon on her Home Screen.
- **Outcome:** her Home Screen shows Project Buddy's icon, named "Project Buddy". It opens at the landing page in a window of its own, with no address bar, which takes her to sign in when she isn't signed in. The splash screen and the bar at the top take the default theme's background, light or dark as her phone is set. Every page comes from the site, as in the browser: nothing she sees is an old saved copy.
- **Next:**
  - [`use_case_turn_on_notifications`](#use_case_turn_on_notifications): get notifications on the phone, which an iPhone allows only once the app is installed.

## use_case_turn_on_notifications

The user turns notifications on for one of her devices, and checks they arrive.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link). On an iPhone or iPad, [`use_case_install_app`](#use_case_install_app) too.
- **Steps:**
  - She opens Settings, and finds the Notifications section, with a switch for this device that is off.
  - She switches it on. Only now does her browser ask whether Project Buddy may send notifications, and she allows them.
  - She sends a test notification, and taps it when it arrives.
  - On another device she switches notifications on too, and sends another test.
  - Later, on the first device, she switches them off.
- **Outcome:** the browser never asks for permission before she switches notifications on. Once they are on, the test notification arrives on that device, says it comes from Project Buddy, and tapping it opens Settings. With two devices on, a test arrives on both; switched off on one, it arrives only on the other, and switching it on again doesn't make it arrive twice. Settings says when a test reached no device. A device her browser can no longer reach is dropped by itself. Her notifications reach only her devices: no other user can send her one or turn hers off, and when someone else signs in on a browser she used and turns notifications on there, hers stop going to it. Someone who only opens Settings in that browser sees the switch off, and her notifications still go there. Only push services that browsers use receive notifications from the site. The Notifications section fits a phone's screen in every theme.
- **Variations:**
  - She dismisses the browser's question: the switch stays off, and she can try again.
  - She blocks notifications: Settings says to allow them in the browser's site settings, with no switch.
  - Her browser can't show notifications, as on an iPhone before installing the app: Settings says to add Project Buddy to the Home Screen first, with no switch.
  - The site's notification keys aren't set up: Settings says notifications aren't set up yet.
- **Next:**
  - [`use_case_hide_extras`](appearance.md#use_case_hide_extras): adjust the rest of Settings while she is there.
