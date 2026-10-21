// The auth workflows' use cases (decision `e2e-visual-and-auth-only` in
// docs/Decisions-Code-and-tooling.md):
// sign-up, sign-in, sign-out, the sign-in limits, and the signed-out access
// gate. Outside e2e/visual/, an e2e test names only one of these;
// use-cases.test.ts checks it, and that each of them is a case.
const AUTH_CASES: readonly `use_case_${string}`[] = [
  "use_case_sign_up",
  "use_case_sign_up_existing_email",
  "use_case_sign_up_requires_invitation",
  "use_case_invitation_unusable",
  "use_case_admin_invites",
  "use_case_sign_in_by_link",
  "use_case_sign_in_link_reused",
  "use_case_sign_in_link_expired",
  "use_case_too_many_sign_in_requests",
  "use_case_visit_signed_out",
  "use_case_return_signed_in",
  "use_case_session_expired",
  "use_case_sign_out",
  "use_case_sign_out_everywhere",
];

export { AUTH_CASES };
