# Generated images

## use_case_generate_image

The user asks their construct to create an image in a standalone or quest adventure.

- **Prerequisites:** the user is signed in, the image provider is configured, and they have enough gold for a generation reservation.
- **Steps:**
  - The user describes the image they want in an adventure message.
  - The construct starts creating the requested image.
  - The adventure announces that generation is working, then shows the image, its prompt, a full-image link and a download link.
  - The user reloads the adventure and downloads the saved result.
- **Outcome:** the result persists in the adventure and gallery. The quest owner and current team members can read its bytes and metadata through the adventure. Users without adventure access cannot. The generation sets aside 25 gold of the acting user's balance before calling the provider, then replaces the reservation with the reported cost. Text adventures spend the same balance.
- **Variations:** missing credentials make generation unavailable without charging. Too little gold refuses generation before the provider call, saying so. Provider or storage failures show a useful error; uncertain billing retains the reservation. Reopening the adventure does not generate or charge again. An interrupted request does not restart automatically.

## use_case_image_gallery

The user finds images their construct previously generated.

- **Prerequisites:** the user is signed in.
- **Steps:**
  - The user opens Image gallery from the site menu.
  - The gallery shows their generated images, newest first, with their prompts and links to the source adventures. Older images are available through a link.
  - The user views an image at full size, downloads it, or returns to its source adventure.
- **Outcome:** only the user's own images appear. The gallery and adventure image controls work with a keyboard and on phone screens. An empty gallery explains how to create the first image. Failed and interrupted generations retain context without showing broken image previews.
- **Deletion:** images belong to their source adventure. Deleting the adventure, its quest, or the account cascades to image bytes and generation metadata. There is no separate image-delete control. Deletion never refunds model spending. Downloaded copies remain outside the site.
