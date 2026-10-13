// Use cases written before their tests; each lane removes its entries.

// No lanes have pending cases. When a case is written before its test, add its
// lane here.
type Lane = never;

interface PendingCase {
  readonly slug: `use_case_${string}`;
  readonly lane: Lane;
}

const PENDING_CASES: readonly PendingCase[] = [];

export { PENDING_CASES };
