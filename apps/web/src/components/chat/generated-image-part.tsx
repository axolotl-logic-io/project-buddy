import Image from "next/image";
import type { JSX } from "react";
import type { ToolCallPart } from "@/components/chat/tool-parts.tsx";
import { EarnGoldLink } from "@/components/earn-gold-link.tsx";
import {
  GENERATE_IMAGE_OUTPUT,
  generatedImageUrl,
} from "@/images/generation-contract.ts";
import { GENERATION_COPY } from "@/ui/copy/generation.ts";

function GeneratedImagePart({
  part,
}: {
  readonly part: Pick<ToolCallPart, "result">;
}): JSX.Element {
  if (part.result === undefined) {
    return <p role="status">{GENERATION_COPY.working}</p>;
  }
  const output = GENERATE_IMAGE_OUTPUT.safeParse(part.result);
  if (!output.success) {
    return <p role="alert">{GENERATION_COPY.failed}</p>;
  }
  const result = output.data;
  if (result.status !== "generated") {
    let status: string = GENERATION_COPY[result.status];
    if (
      result.status === "outOfGold" &&
      result.requiredGold !== undefined &&
      result.availableGold !== undefined
    ) {
      status = GENERATION_COPY.reservationRefused(
        result.requiredGold,
        result.availableGold,
      );
    }
    return (
      <>
        <p role="status">{status}</p>
        {result.status === "outOfGold" && (
          <p>
            <EarnGoldLink />
          </p>
        )}
      </>
    );
  }
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <a
        aria-label={GENERATION_COPY.view}
        className="generated-image-link"
        href={generatedImageUrl(result.id)}
        target="_blank"
        rel="noreferrer"
      >
        <Image
          unoptimized={true}
          alt=""
          className="chat-image"
          src={generatedImageUrl(result.id)}
          width={1024}
          height={1024}
        />
      </a>
      <figcaption className="break-words text-muted text-sm">
        {result.prompt}
      </figcaption>
      <a
        className="text-link"
        href={generatedImageUrl(result.id, true)}
        download={true}
      >
        {GENERATION_COPY.download}
      </a>
    </figure>
  );
}

export { GeneratedImagePart };
