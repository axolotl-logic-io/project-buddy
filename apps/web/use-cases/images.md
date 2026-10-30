# Generated images

## use_case_generate_image

The user asks their buddy to create an image in a standalone or project chat.

- **Prerequisites:** the user is signed in, the image provider is configured, and their monthly quota has room for a generation reservation.
- **Steps:**
  - The user describes the image they want in a chat message.
  - The buddy starts creating the requested image.
  - The chat announces that generation is working, then shows the image, its prompt, a full-image link and a download link.
  - The user reloads the chat and downloads the saved result.
- **Outcome:** the result persists in the chat and gallery. Another user cannot read its bytes or metadata. The generation reserves $0.25 from the user's $5 UTC monthly quota before calling the provider, then replaces the reservation with reported spending. Text chat spending continues to count against the same limit.
- **Variations:** missing credentials make generation unavailable without charging. Insufficient quota refuses generation before the provider call. Provider or storage failures show a useful error; uncertain billing retains the reservation. Reopening the chat does not generate or charge again. An interrupted request does not restart automatically.

## use_case_image_gallery

The user finds images their buddy previously generated.

- **Prerequisites:** the user is signed in.
- **Steps:**
  - The user opens Image gallery from the site menu.
  - The gallery shows their generated images, newest first, with their prompts and links to the source chats. Older images are available through a link.
  - The user views an image at full size, downloads it, or returns to its source chat.
- **Outcome:** only the user's own images appear. The gallery and chat image controls work with a keyboard and on phone screens. An empty gallery explains how to create the first image. Failed and interrupted generations retain context without showing broken image previews.
- **Deletion:** images belong to their source chat. Deleting the chat, its project, or the account cascades to image bytes and generation metadata. There is no separate image-delete control. Deletion never refunds model spending. Downloaded copies remain outside the site.
