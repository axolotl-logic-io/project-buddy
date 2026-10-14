import { useSyncExternalStore } from "react";
import {
  DEFAULT_FLAG_ATTRIBUTES,
  HIDE_ATTRIBUTE,
  hiddenFlagsIn,
  readAppliedHide,
  subscribeToFlags,
} from "@/flags/flag-choice.ts";
import type { FlagId } from "@/flags/flags.ts";

function serverHide(): string {
  return DEFAULT_FLAG_ATTRIBUTES[HIDE_ATTRIBUTE];
}

// The flags hidden on the page, kept current as they change, for a client
// component. The server render and hydration see the default, then the
// applied choice.
export function useHiddenFlags(): readonly FlagId[] {
  return hiddenFlagsIn(
    useSyncExternalStore(subscribeToFlags, readAppliedHide, serverHide),
  );
}
