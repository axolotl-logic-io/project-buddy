// What a switch on the Settings page does: it shows or hides its extra on
// this page at once, then saves the choice to her account and this
// browser's cookie (flag-choice.ts's header has both places the cookie is
// written).
import {
  applyHiddenFlags,
  hiddenFlagsIn,
  readAppliedHide,
} from "@/flags/flag-choice.ts";
import { type FlagId, knownFlags } from "@/flags/flags.ts";
import { saveHiddenFlagsAction } from "@/flags/save-hidden-flags-action.ts";

function keepUnsaved(): void {
  // The choice still applies to this page; her account and this browser
  // keep the one saved before.
}

// The seam for accounts: the one place the browser saves the choice. The
// Server Action saves it to her account, then to this browser's cookie.
// Each call carries the whole choice, and Next runs a page's Server Actions
// one at a time, so the last switch wins.
function saveHiddenFlags(hidden: readonly FlagId[]): void {
  saveHiddenFlagsAction(hidden).catch(keepUnsaved);
}

// Shows (on) or hides the extra at once, and saves the choice.
function switchFlag(id: FlagId, on: boolean): void {
  const others = hiddenFlagsIn(readAppliedHide()).filter((flag) => flag !== id);
  let hidden = others;
  if (!on) {
    hidden = knownFlags([...others, id]);
  }
  applyHiddenFlags(hidden);
  saveHiddenFlags(hidden);
}

export { switchFlag };
