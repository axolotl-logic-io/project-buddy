// Use cases written before their tests; each lane removes its entries.

// The lane that brings the site in line with the rites-and-spaces glossary.
type Lane = "rites-and-spaces";

interface PendingCase {
  readonly slug: `use_case_${string}`;
  readonly lane: Lane;
}

const PENDING_CASES: readonly PendingCase[] = [
  { slug: "use_case_grimoire_page", lane: "rites-and-spaces" },
  { slug: "use_case_customize_rite", lane: "rites-and-spaces" },
  { slug: "use_case_quest_spaces", lane: "rites-and-spaces" },
];

export { PENDING_CASES };
