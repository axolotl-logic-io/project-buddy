import Link from "next/link";
import type { JSX } from "react";
import { MARKETPLACE_COPY } from "@/ui/copy/marketplace.ts";

// The link every out-of-gold message ends with, to where a user earns gold:
// selling their own prompts in the Marketplace. It follows the message's
// text, after a space.
export function EarnGoldLink(): JSX.Element {
  return (
    <>
      {" "}
      <Link className="text-link" href="/marketplace#your-listings">
        {MARKETPLACE_COPY.earnGold}
      </Link>
    </>
  );
}
