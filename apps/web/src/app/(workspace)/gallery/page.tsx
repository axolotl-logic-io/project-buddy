import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { GeneratedImagePart } from "@/components/chat/generated-image-part.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import {
  GALLERY_PAGE_SIZE,
  GENERATION_ID,
  type GenerationId,
} from "@/images/generation-contract.ts";
import { listGeneratedImages } from "@/images/generation-store.ts";
import { HOME_PATH } from "@/routes.ts";
import { GENERATION_COPY } from "@/ui/copy/generation.ts";

const CURSOR = z.object({ before: z.iso.datetime(), beforeId: GENERATION_ID });
const metadata: Metadata = { title: GENERATION_COPY.title };

async function GalleryPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ before?: string; beforeId?: string }>;
}): Promise<JSX.Element> {
  const user = await requireUser();
  const before = CURSOR.safeParse(await searchParams).data;
  let cursor:
    | { readonly createdAt: Date; readonly id: GenerationId }
    | undefined;
  if (before !== undefined) {
    cursor = { createdAt: new Date(before.before), id: before.beforeId };
  }
  const images = await listGeneratedImages(user.id, cursor);
  const last = images.at(-1);
  return (
    <>
      <BackLink href={HOME_PATH}>{GENERATION_COPY.home}</BackLink>
      <h1 className="page-heading">{GENERATION_COPY.heading}</h1>
      <p className="text-muted text-sm">{GENERATION_COPY.context}</p>
      {images.length === 0 && <p>{GENERATION_COPY.empty}</p>}
      <ul className="grid min-w-0 gap-4 sm:grid-cols-2">
        {images.map((image) => (
          <li className="card flex min-w-0 flex-col gap-3" key={image.id}>
            {image.status === "generated" && (
              <GeneratedImagePart
                part={{
                  result: {
                    status: "generated",
                    id: image.id,
                    prompt: image.prompt,
                  },
                }}
              />
            )}
            {image.status !== "generated" && (
              <>
                <p className="break-words">{image.prompt}</p>
                <p role="status">{GENERATION_COPY[image.status]}</p>
              </>
            )}
            <Link className="text-link" href={`/chats/${image.chatId}`}>
              {GENERATION_COPY.source}
            </Link>
          </li>
        ))}
      </ul>
      {images.length === GALLERY_PAGE_SIZE && last !== undefined && (
        <Link
          className="text-link"
          href={`/gallery?before=${encodeURIComponent(last.createdAt.toISOString())}&beforeId=${last.id}`}
        >
          {GENERATION_COPY.older}
        </Link>
      )}
    </>
  );
}

export { metadata };
export default GalleryPage;
