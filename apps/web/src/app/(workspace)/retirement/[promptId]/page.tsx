import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { LocalTime } from "@/components/local-time.tsx";
import { PromptText } from "@/components/prompt-text.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import { getRetiredDefinition } from "@/retirement/retirement-store.ts";
import { RETIREMENT_COPY } from "@/ui/copy/retirement.ts";
import { RetirementActions } from "../retirement-actions.tsx";

const metadata: Metadata = { title: RETIREMENT_COPY.title };
async function RetiredDefinitionPage({
  params,
}: PageProps<"/retirement/[promptId]">): Promise<JSX.Element> {
  const user = await requireUser();
  const { promptId } = await params;
  const definition = await getRetiredDefinition(user.id, promptId);
  if (definition === undefined) {
    notFound();
  }
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="page-heading">{definition.name}</h1>
        <p className="text-muted">
          {RETIREMENT_COPY.kind[definition.kind]}
          {RETIREMENT_COPY.separator}
          {RETIREMENT_COPY.dateLabel}{" "}
          <LocalTime dateTime={definition.retiredAt} detail="day" />
        </p>
      </header>
      <RetirementActions definition={definition} />
      {definition.kind === "construct" && (
        <Notice>{RETIREMENT_COPY.fallback}</Notice>
      )}
      <h2 className="section-heading">{RETIREMENT_COPY.instructions}</h2>
      {definition.texts.map((field) => (
        <PromptText
          editable={false}
          help=""
          key={field.name}
          label={RETIREMENT_COPY.fields[field.name]}
          name={field.name}
          text={field.text}
        />
      ))}
    </>
  );
}

export { metadata };
export default RetiredDefinitionPage;
