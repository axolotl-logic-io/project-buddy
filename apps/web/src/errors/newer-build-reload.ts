// Reloading a page that is still on the previous build. During a deploy, a
// browser on the old build can get a case name only the new build knows,
// which it would show as the unknown case; a reload picks up the new build,
// whose message names the case. A reload is tried once a minute at most: the
// stamp is written before reloading, so a page that still doesn't know the
// case after it shows the unknown message instead of reloading again. Only
// the browser imports this module.

type ReloadStampStorage = Pick<Storage, "getItem" | "setItem">;

// The session storage key of the time of the last such reload, in ms since
// the epoch.
const RELOAD_STAMP_KEY = "newer-build-reload";

// How long after a reload another is held back.
const RELOAD_WINDOW_MS = 60_000;

// The session's storage, or null if the browser blocks it.
function sessionStorageOrNull(): ReloadStampStorage | null {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

// Whether a reload was stamped within the window before time.
function reloadedRecently(stamp: string | null, time: number): boolean {
  if (stamp === null) {
    return false;
  }
  const lastReload = Number(stamp);
  return Number.isFinite(lastReload) && time - lastReload < RELOAD_WINDOW_MS;
}

// Reloads the page unless it was reloaded for a newer build within the last
// minute, and says whether it did. Without storage to stamp, as when the
// browser blocks it, it doesn't reload, since nothing would stop a loop.
function reloadForNewerBuild(
  storage: ReloadStampStorage | null = sessionStorageOrNull(),
  reload: () => void = () => location.reload(),
  now: () => number = Date.now,
): boolean {
  if (storage === null) {
    return false;
  }
  const time = now();
  try {
    if (reloadedRecently(storage.getItem(RELOAD_STAMP_KEY), time)) {
      return false;
    }
    storage.setItem(RELOAD_STAMP_KEY, String(time));
  } catch {
    return false;
  }
  reload();
  return true;
}

export { RELOAD_WINDOW_MS, reloadForNewerBuild };
