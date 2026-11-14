import Image from "next/image";
import type { JSX } from "react";
import type { ToolCallPart } from "@/components/chat/tool-parts.tsx";
import {
  GENERATE_IMAGE_OUTPUT,
  generatedImageUrl,
} from "@/images/generation-contract.ts";
import { GENERATION_COPY } from "@/ui/copy/generation.ts";

// A generated image's result in the chat: its progress, the reason it isn't
// there, or the image with its prompt and download link. In the chat the
// image is 18rem tall and as wide as its shape; fillWidth fills the
// container's width instead, at the image's own shape, on a sunken slot that
// frames it while it loads, as the gallery's cards do.
function GeneratedImagePart({
  part,
  fillWidth = false,
}: {
  readonly part: Pick<ToolCallPart, "result">;
  readonly fillWidth?: boolean;
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
      </>
    );
  }
  let linkClass = "generated-image-link";
  let imageClass = "chat-image";
  if (fillWidth === true) {
    linkClass += " generated-image-fill";
    imageClass += " chat-image-fill";
  }
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <a
        aria-label={GENERATION_COPY.view}
        className={linkClass}
        href={generatedImageUrl(result.id)}
        target="_blank"
        rel="noreferrer"
      >
        <Image
          unoptimized={true}
          alt=""
          className={imageClass}
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
