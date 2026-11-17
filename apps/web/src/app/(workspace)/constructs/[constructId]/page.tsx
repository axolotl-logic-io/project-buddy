import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { ConstructVisualPreview } from "@/components/constructs/construct-visual-preview.tsx";
import { getConstruct, isConstructId } from "@/constructs/index.ts";
import { VISUAL_COPY } from "@/ui/copy/construct-visuals.ts";
import { pageTitle } from "@/ui/copy/site.ts";

async function generateMetadata({
  params,
}: PageProps<"/constructs/[constructId]">): Promise<Metadata> {
  await requireUser();
  const { constructId } = await params;
  let name = "Construct";
  if (isConstructId(constructId)) {
    ({ name } = getConstruct(constructId));
  }
  return { title: pageTitle(name) };
}

export default async function ConstructPage({
  params,
}: PageProps<"/constructs/[constructId]">): Promise<JSX.Element> {
  await requireUser();
  const { constructId } = await params;
  if (!isConstructId(constructId)) {
    notFound();
  }
  const construct = getConstruct(constructId);
  return (
    <section
      className="definition-editor flex min-w-0 flex-col gap-4"
      aria-label={VISUAL_COPY.heading}
    >
      <h2 className="section-heading">{VISUAL_COPY.heading}</h2>
      <p className="whitespace-pre-wrap break-words">
        {construct.definition.visual?.description}
      </p>
      <ConstructVisualPreview construct={construct} />
    </section>
  );
}

export { generateMetadata };
