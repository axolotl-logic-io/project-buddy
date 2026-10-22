# Code colour readiness (#514)

## Original failure

The unchanged post-merge wrapper for #511 failed at integration commit
`9d8b3ae13e80365d298569212dc29c6b61d80e4a`. Its retained receipt is
`issue-511/verify-9d8b3ae1/test.log` in the installed pipeline's run directory.
It reports 261 passed web test files and one failed file; 2067 passed tests and
one failed test. This work does not change that receipt or recover #511.

In Chromium, the selected-Dark browser scenario compared its code colours before
and after a system light-to-dark change. Entry 2 changed from keyword
`oklch(0.76 0.12 340)` to foreground `oklch(0.92 0.035 85)`. The log names a
failure screenshot, but the implementation session could not find that image.

## Diagnosis and limits

The existing saved-chat scenario renders the Python below. Captures from both
Chromium and WebKit map entry 2 of the original span-colour list to ` bpy`, the
plain name after `import`.

```python
import bpy
bpy.ops.mesh.bevel(offset=0.1)
```

That name should use foreground. The failed light-system reference therefore
contained an incorrect syntax colour, which the existing readiness condition
(`codeColorCount() > 1`) accepts. Counting colours proves neither complete nor
correct highlighting. Comparing another state with that reference cannot
establish which state is correct.

The site supplies the same CSS-variable highlighting theme for both system
schemes. New DOM captures show `var(--foreground)` for ` bpy` in both slots,
`var(--code-keyword)` for `import`, `var(--code-function)` for `bevel`, and
`var(--code-constant)` for `offset` and `0.1`.

**The trigger for the original incorrect colour remains unconfirmed.** The
unchanged focused file passed in both browsers. Diagnostic captures with the
existing scenario, including a normal full unit/browser run, did not reproduce
the mismatch. Small Chromium probes of raw-to-highlighted span updates, with and
without offscreen automatic content visibility, also did not reproduce it.
These observations do not dismiss the original failure or establish that it was
only a test problem. No production highlighting change is justified by this
evidence yet.

## Candidate assertions

The candidate retains the original multi-colour assertion, complete span-list
strict equality, 4000 ms render bound, and keyword-colour checks in both selected
modes. It adds these observations:

- Before taking the light-system reference, every Python character has its
  expected syntax colour from the selected mode's semantic contract. This checks
  plain names and punctuation as well as keywords, functions and constants.
- After each emulation command, the test iframe reports the requested system
  scheme through `matchMedia`.
- After the system changes to Dark, the original immediate strict equality still
  holds, and the complete character colouring is correct.
- After the system changes back to Light, both immediate comparisons still hold.
- The existing Light and Dark keyword tests also await the complete colouring.

The character comparison does not depend on how a highlighter divides text
between spans. It supplements, rather than replaces, the original span-list
comparison. Only initial highlighting readiness polls colours; a mismatch after
a system change is still an immediate failure. There are no sleeps, retries,
skips or extended timeouts.

These assertions close a demonstrated gap in the readiness criterion. They are
not, by themselves, proof of the original trigger or a confirmed product repair.

## Implementation validation boundary

The owner's trusted grant reserves heavy-test capacity exclusively for #514
Implementation. The canonical setup receipt reported lane 1 and exit 0; the
assigned `apps/web/.env.test` existed. The session did not read or modify that
file or provision another environment.

Before the candidate, a diagnostic full `npm test` run reported 261 passed files,
one failed file, 2075 passed tests and one failed test. The failure was
`scripts/test-db/test-database.test.ts > checkTestEnvironment's email > refuses
the outbox on a production deployment`: it expected the outbox refusal but
received the mock-tutor production refusal first. This is separate from the code
colour failure. The implementation does not change the owner-merged #512 work.

One exploratory snapshot capture also failed because Chromium and WebKit shared
a temporary geometry snapshot with different heights. Those temporary assertions
are not part of the candidate. The session retained the diagnostic sources,
snapshots and logs outside the checkout, separately from the original receipt.

The implementation summary records the focused and unchanged full-wrapper
results on the committed candidate. Independent review, Security and any later
landing require separate authorization. This work does not release the site,
retry #511, recover #512 or authorize a legacy merge run.
