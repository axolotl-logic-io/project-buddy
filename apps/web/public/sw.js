// Temporary retirement asset at the original worker URL. Existing installed
// apps fetch this update on launch; new installations need no worker.
// Never intercept navigation or renew a subscription.
async function retire() {
  try {
    const subscription =
      await globalThis.registration.pushManager.getSubscription();
    await subscription?.unsubscribe();
  } finally {
    await globalThis.registration.unregister();
  }
}

globalThis.addEventListener("install", (event) => {
  event.waitUntil(globalThis.skipWaiting());
});

globalThis.addEventListener("activate", (event) => {
  event.waitUntil(retire());
});
