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
- **Variations:** missing credentials make generation unavailable without charging. Too little gold refuses generation before the provider call, showing the required reservation and the whole gold available for that request. This does not imply a zero balance or free replies. Provider or storage failures show a useful error; uncertain billing retains the reservation. Reopening the adventure does not generate or charge again. An interrupted request does not restart automatically.

## use_case_image_gallery

The user finds images their construct previously generated.

- **Prerequisites:** the user is signed in.
- **Steps:**
  - The user opens Image gallery from the site menu.
  - The gallery shows their generated images, newest first, with their prompts, recorded generation dates in the browser’s time zone, and links to the source adventures. Older images are available through a link.
  - The user views an image at full size, downloads it, or returns to its source adventure.
- **Outcome:** only the user's own images appear. The gallery and adventure image controls work with a keyboard and on phone screens. An empty gallery explains how to create the first image. Failed and interrupted generations retain context without showing broken image previews.
- **Deletion:** images belong to their source adventure. Deleting the adventure, its quest, or the account cascades to image bytes and generation metadata. There is no separate image-delete control. Deletion never refunds model spending. Downloaded copies remain outside the site.

## use_case_generate_construct_visual

The user generates artwork for a saved own construct and keeps it in the places they use that construct.

- **Prerequisites:** a signed-in account, a saved own construct with a Visual description, an available image provider and enough gold for the displayed reservation.
- **Steps:**
  - Open the construct's Workshop, edit the Visual description, review the gold reservation beside Save and generate images and choose that action or Generate Images. Both save the current edits. Save generates only for a changed normalized Visual description; Generate Images is explicit regeneration even when unchanged, with visible loading feedback.
  - Use the resulting artwork in a new adventure, a clone, or a Marketplace listing and its bought copies.
  - Reopen the Workshop after a lost response to check whether the request finished before trying again.
- **Outcome:** one paid generation supplies avatar, portrait, opening and working appearances. Repeating the same request never charges twice. Existing copies and adventures keep their artwork when the source changes or is deleted. Construct artwork creates no adventure and does not appear in Image gallery.
- **Variations:**
  - Built-ins offer Customize before generation. Generate Images saves unsaved edits before generation. Unavailable generation or insufficient gold makes no paid request.
  - If the Visual description changes or the construct is retired/deleted during generation, the result does not replace its prior artwork. Text edits are preserved alongside a valid result and do not stale it. Later description edits keep saved artwork and mark new description-fingerprinted art outdated; legacy freshness may be unknown. The provider receives exactly the validated description and no name, conversational prompt, reference image or creative wrapper.
  - An uncertain billed failure keeps the gold reservation and existing artwork. Checking status spends no gold and starts no generation. A confirmed failure requires an explicit retry that may spend gold; unresolved requests follow the recovery choices in [`use_case_generate_construct_images`](constructs.md#use_case_generate_construct_images).
  - A quest's owner and current members can see artwork saved in its adventures. Removed members lose access immediately. Buyers keep their copies' artwork after unlisting; browsing never gives access to the seller's private source.
- **Next:** [`use_case_generate_construct_images`](constructs.md#use_case_generate_construct_images): manage previews, status checks and recovery in the Workshop.
