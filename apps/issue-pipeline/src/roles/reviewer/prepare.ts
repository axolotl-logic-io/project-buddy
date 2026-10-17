// The reviewer's `prepare` check: the prepare-review op on the issue's
// branch, and the review bundle it wrote, read from disk so the lenses'
// tasks can hold it. It answers `ok` with the op's reply and the bundle's
// text, `empty` when the branch changes no file, or the op's failure. The
// one reviewer module that reads a file (biome.jsonc's Node-API override,
// `best-practice-over-lint`).

import fs from "node:fs";
import { z } from "zod";
import type { Outcome } from "../../job/run-step.ts";
import type { Entry } from "../../job/runner.ts";
import { stackFields } from "../../workflow/stages/stacked.ts";
import type { JobEffects } from "../registry.ts";

const PREPARED = z.looseObject({
  changedFiles: z.array(z.string()),
  // An op before #415 wrote the diff alone.
  bundlePath: z.string().optional(),
});

async function prepare(entry: Entry, effects: JobEffects): Promise<Outcome> {
  const payload = {
    number: entry.context.issue,
    tag: "r0",
    ...stackFields(entry.saved.stackedOn),
  };
  const done = await effects.op({ kind: "op", op: "prepare-review", payload });
  if (!done.ok) {
    return done;
  }
  const reply = PREPARED.parse(done.reply);
  if (reply.changedFiles.length === 0) {
    return { ok: true, name: "empty", reply: null };
  }
  const { bundlePath } = reply;
  if (bundlePath === undefined) {
    return { ok: true, name: "ok", reply };
  }
  const bundleText = fs.readFileSync(bundlePath, "utf8");
  return { ok: true, name: "ok", reply: { ...reply, bundleText } };
}

export { prepare };
