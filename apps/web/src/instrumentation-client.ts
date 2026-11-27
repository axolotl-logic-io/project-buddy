// Next calls its navigation hook inside the router's React transition.
// Subscribers can use optimistic state that lasts for exactly that transition.
const listeners = new Set<() => void>();

function subscribeToPageChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// This Next.js hook covers links, router push or replace, and Back or
// Forward. Prefetches and refreshes of the current page are outside it.
function onRouterTransitionStart(): void {
  for (const listener of listeners) {
    listener();
  }
}

export { onRouterTransitionStart, subscribeToPageChanges };
