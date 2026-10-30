"use client";
import { AttachmentPrimitive, useAuiState } from "@assistant-ui/react";
import Image from "next/image";
import { type JSX, useEffect, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { IMAGE_COPY } from "@/ui/copy/images.ts";

function ImageAttachment({
  removable = true,
}: {
  removable?: boolean;
}): JSX.Element {
  const attachment = useAuiState((state) => state.attachment);
  const [preview, setPreview] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (
      attachment.file === undefined ||
      !attachment.file.type.startsWith("image/")
    ) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (): void => {
      if (typeof reader.result === "string") {
        setPreview(reader.result);
      }
    };
    reader.readAsDataURL(attachment.file);
    return (): void => {
      reader.abort();
    };
  }, [attachment.file]);
  const image = attachment.content?.find((part) => part.type === "image");
  const source = preview ?? image?.image;
  let containerClass = "flex min-w-0 flex-col gap-2";
  let imageClass = "chat-image";
  if (removable === true) {
    containerClass += " w-40 shrink-0";
    imageClass += " chat-image-draft";
  }

  return (
    <AttachmentPrimitive.Root className={containerClass}>
      {source !== undefined && (
        <Image
          unoptimized={true}
          width={320}
          height={240}
          alt={attachment.name || IMAGE_COPY.preview}
          className={imageClass}
          src={source}
        />
      )}
      <p className="break-words text-sm">{attachment.name}</p>
      {attachment.status.type === "running" && (
        <p role="status">{IMAGE_COPY.uploading}</p>
      )}
      {attachment.status.type === "incomplete" && (
        <p role="alert">
          {attachment.status.message ?? IMAGE_COPY.uploadFailed}
        </p>
      )}
      {removable === true && (
        <AttachmentPrimitive.Remove asChild={true}>
          <Button variant="quiet">{IMAGE_COPY.remove}</Button>
        </AttachmentPrimitive.Remove>
      )}
    </AttachmentPrimitive.Root>
  );
}

export { ImageAttachment };
