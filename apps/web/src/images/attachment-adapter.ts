import type {
  Attachment,
  AttachmentAdapter,
  CompleteAttachment,
  PendingAttachment,
} from "@assistant-ui/react";
import { z } from "zod";
import { AppError, readAppErrorCase, userMessage } from "@/errors/app-error.ts";
import type { ChatId } from "@/ids.ts";
import {
  IMAGE_FILE_PART,
  IMAGE_MEDIA_TYPE,
  MAX_IMAGE_BYTES,
  MAX_MESSAGE_IMAGES,
} from "@/images/image-contract.ts";
import { IMAGE_COPY } from "@/ui/copy/images.ts";

// Uploads before send: a failed upload stays in the composer, alongside its
// text, with a removable error. A complete upload is a private reference.
function imageAttachmentAdapter(chatId: ChatId): AttachmentAdapter {
  const pending = new Set<string>();
  return {
    accept: "image/*",
    async *add({
      file,
    }: {
      file: File;
    }): AsyncGenerator<PendingAttachment, void> {
      const id = crypto.randomUUID();
      const attachment: PendingAttachment = {
        id,
        type: "image",
        name: file.name,
        contentType: file.type,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      };
      if (
        pending.size >= MAX_MESSAGE_IMAGES ||
        file.size > MAX_IMAGE_BYTES ||
        !IMAGE_MEDIA_TYPE.safeParse(file.type).success
      ) {
        yield {
          ...attachment,
          status: {
            type: "incomplete",
            reason: "error",
            message: userMessage("invalid-image"),
          },
        };
        return;
      }
      pending.add(id);
      yield {
        ...attachment,
        status: { type: "running", reason: "uploading", progress: 0 },
      };
      try {
        const response = await fetch(`/api/images?chat=${chatId}`, {
          method: "POST",
          headers: { "content-type": file.type },
          body: file,
        });
        if (!response.ok) {
          throw new AppError(
            readAppErrorCase(await response.text()),
            undefined,
          );
        }
        const body = z.object({ url: z.string() }).parse(await response.json());
        const part = IMAGE_FILE_PART.parse({
          type: "file",
          mediaType: file.type,
          filename: file.name,
          ...body,
        });
        yield {
          ...attachment,
          content: [
            {
              type: "image",
              image: new URL(part.url, globalThis.location.origin).href,
              filename: file.name,
            },
          ],
        };
      } catch (error) {
        let message = IMAGE_COPY.uploadFailed;
        if (error instanceof AppError) {
          ({ message } = error);
        }
        yield {
          ...attachment,
          status: { type: "incomplete", reason: "error", message },
        };
      }
    },
    send: (attachment: PendingAttachment): Promise<CompleteAttachment> => {
      if (
        attachment.status.type !== "requires-action" ||
        attachment.content?.length !== 1
      ) {
        return Promise.reject(new Error(IMAGE_COPY.uploadFailed));
      }
      pending.delete(attachment.id);
      return Promise.resolve({
        ...attachment,
        content: attachment.content ?? [],
        status: { type: "complete" },
      });
    },
    remove: (attachment: Attachment): Promise<void> => {
      pending.delete(attachment.id);
      return Promise.resolve();
    },
  };
}

export { imageAttachmentAdapter };
