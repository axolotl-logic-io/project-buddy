// Whether the page is in the browser and hydrated: false while the server
// renders and while the browser hydrates its HTML, true from then on.
import { useSyncExternalStore } from "react";

function subscribeToNothing(): () => void {
  return (): void => {
    // Whether the page is hydrated never changes once it is.
  };
}

function hydrated(): boolean {
  return true;
}

function notHydrated(): boolean {
  return false;
}

function useHydrated(): boolean {
  return useSyncExternalStore(subscribeToNothing, hydrated, notHydrated);
}

export { useHydrated };
