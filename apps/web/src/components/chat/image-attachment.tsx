"use client";
import { AttachmentPrimitive, useAuiState } from "@assistant-ui/react";
import Image from "next/image";
import type { JSX } from "react";
import { IMAGE_COPY } from "@/ui/copy/images.ts";

// Read-only images from saved messages. New messages accept text only.
function ImageAttachment(): JSX.Element {
  const attachment = useAuiState((state) => state.attachment);
  const image = attachment.content?.find((part) => part.type === "image");
  return (
    <AttachmentPrimitive.Root className="flex min-w-0 flex-col gap-2">
      {image !== undefined && (
        <Image
          unoptimized={true}
          width={320}
          height={240}
          alt={attachment.name || IMAGE_COPY.preview}
          className="chat-image"
          src={image.image}
        />
      )}
      <p className="break-words text-sm">{attachment.name}</p>
    </AttachmentPrimitive.Root>
  );
}

export { ImageAttachment };
