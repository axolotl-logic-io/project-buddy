// Stored data for the phone checks (phone-pages-test-kit.tsx), shaped as the
// stores return it: what each page shows beyond page-fixtures.ts's
// quests.

import type { SessionUser } from "@/auth/session-token.ts";
import { userIdFixture } from "../../support/id-fixtures.ts";

// The user a sign-in link that works signs in: a signed-up account, so
// continuing needs no name.
const LINK_USER: SessionUser & { readonly needsName: boolean } = {
  id: userIdFixture("5b1f0c3e-8a2d-4c6b-9e7f-0a1b2c3d4e5f"),
  sessionEpoch: 0,
  needsName: false,
};

export { LINK_USER };
