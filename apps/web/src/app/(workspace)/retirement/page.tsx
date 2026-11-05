import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { BackLink } from "@/components/ui/back-link.tsx";
import { listRetiredDefinitions } from "@/retirement/retirement-store.ts";
import { HOME_PATH } from "@/routes.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { RetirementList } from "./retirement-list.tsx";

const metadata: Metadata = { title: RETIREMENT_COPY.title };
async function RetirementPage({
  searchParams,
}: PageProps<"/retirement">): Promise<JSX.Element> {
  const user = await requireUser();
  const { restored, deleted } = await searchParams;
  const definitions = await listRetiredDefinitions(user.id);
  return (
    <>
      <BackLink href={HOME_PATH}>{RETIREMENT_COPY.home}</BackLink>
      <h1 className="page-heading">{RETIREMENT_COPY.heading}</h1>
      <p className="text-muted">{RETIREMENT_COPY.intro}</p>
      {restored === "1" && <p role="status">{RETIREMENT_COPY.restored}</p>}
      {deleted === "1" && <p role="status">{RETIREMENT_COPY.deleted}</p>}
      <RetirementList definitions={definitions} />
      <p className="text-muted text-sm">{RETIREMENT_COPY.help}</p>
      <p className="text-muted text-sm">{RETIREMENT_COPY.marketplace}</p>
    </>
  );
}

export { metadata };
export default RetirementPage;
