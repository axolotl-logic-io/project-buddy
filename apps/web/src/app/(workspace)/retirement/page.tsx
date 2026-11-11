import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import { listRetiredDefinitions } from "@/retirement/retirement-store.ts";
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
    <PageWorkspace intro={RETIREMENT_COPY.intro}>
      {(restored === "1" || deleted === "1") && (
        <div className="workspace-content">
          {restored === "1" && (
            <Notice role="status">{RETIREMENT_COPY.restored}</Notice>
          )}
          {deleted === "1" && (
            <Notice role="status">{RETIREMENT_COPY.deleted}</Notice>
          )}
        </div>
      )}
      <RetirementList definitions={definitions}>
        <footer className="flex flex-col gap-2 text-muted text-sm">
          <p>{RETIREMENT_COPY.help}</p>
        </footer>
      </RetirementList>
    </PageWorkspace>
  );
}

export { metadata };
export default RetirementPage;
