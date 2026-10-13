// Use cases written before their tests; each lane removes its entries.

type Lane =
  | "accounts-core"
  | "sign-in-by-link"
  | "spend-and-quota"
  | "account-page-and-flags";

interface PendingCase {
  readonly slug: `use_case_${string}`;
  readonly lane: Lane;
}

const PENDING_CASES: readonly PendingCase[] = [];

export { PENDING_CASES };
