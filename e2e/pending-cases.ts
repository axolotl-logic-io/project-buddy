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

const PENDING_CASES: readonly PendingCase[] = [
  { slug: "use_case_sign_up", lane: "sign-in-by-link" },
  { slug: "use_case_sign_up_existing_email", lane: "sign-in-by-link" },
  { slug: "use_case_sign_in_by_link", lane: "sign-in-by-link" },
  { slug: "use_case_sign_in_link_expired", lane: "sign-in-by-link" },
  { slug: "use_case_sign_in_link_reused", lane: "sign-in-by-link" },
  { slug: "use_case_too_many_sign_in_requests", lane: "sign-in-by-link" },
  { slug: "use_case_sign_up_wrong_passphrase", lane: "sign-in-by-link" },
  { slug: "use_case_sign_up_locked_out", lane: "sign-in-by-link" },
  { slug: "use_case_see_monthly_usage", lane: "account-page-and-flags" },
  { slug: "use_case_settings_follow_user", lane: "account-page-and-flags" },
  { slug: "use_case_sign_out", lane: "account-page-and-flags" },
  { slug: "use_case_sign_out_everywhere", lane: "account-page-and-flags" },
];

export { PENDING_CASES };
