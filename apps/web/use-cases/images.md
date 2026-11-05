# Generated images

## use_case_generate_image

The user asks their buddy to create an image in a standalone or quest chat.

- **Prerequisites:** the user is signed in, the image provider is configured, and they have enough gold for a generation reservation.
- **Steps:**
  - The user describes the image they want in a chat message.
  - The buddy starts creating the requested image.
  - The chat announces that generation is working, then shows the image, its prompt, a full-image link and a download link.
  - The user reloads the chat and downloads the saved result.
- **Outcome:** the result persists in the chat and gallery. The quest owner and current team members can read its bytes and metadata through the chat. Users without chat access cannot. The generation sets aside 25 gold of the acting user's balance before calling the provider, then replaces the reservation with the reported cost. Text chats spend the same balance.
- **Variations:** missing credentials make generation unavailable without charging. Too little gold refuses generation before the provider call, saying so. Provider or storage failures show a useful error; uncertain billing retains the reservation. Reopening the chat does not generate or charge again. An interrupted request does not restart automatically.

## use_case_image_gallery

The user finds images their buddy previously generated.

- **Prerequisites:** the user is signed in.
- **Steps:**
  - The user opens Image gallery from the site menu.
  - The gallery shows their generated images, newest first, with their prompts and links to the source chats. Older images are available through a link.
  - The user views an image at full size, downloads it, or returns to its source chat.
- **Outcome:** only the user's own images appear. The gallery and chat image controls work with a keyboard and on phone screens. An empty gallery explains how to create the first image. Failed and interrupted generations retain context without showing broken image previews.
- **Deletion:** images belong to their source chat. Deleting the chat, its quest, or the account cascades to image bytes and generation metadata. There is no separate image-delete control. Deletion never refunds model spending. Downloaded copies remain outside the site.
