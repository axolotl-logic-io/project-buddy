# Grimoire

The Grimoire offers the built-in rites, Capture and Brainstorm, and the user's own rites. Capture confirms each message. Brainstorm replies with brainstorming cues that help the user think of more. Either can be performed on any list. Built-in pages are read-only and offer Make a copy. Own rites can be created, edited, copied and forgotten.

## use_case_grimoire_page

- **Goal:** Find built-in and own rites from the main menu.
- **Steps:** Open the Grimoire under Places. Type in Find a rite, or press "/" to reach it from anywhere but a field. Choose All, Built-in, Yours or Forgotten. Choose a rite's row to open it. Choose New rite in the trail band to make a private rite.
- **Outcome:** All, Built-in and Yours list only built-ins and the acting user's own active rites; forgotten rites appear only under Forgotten. Each row shows the rite's seal, name, a Built-in tag for built-ins, its first message on one line with placeholders set apart, the day it was last edited or forgotten, and its count of replies. The search matches names and first messages as the user types; Escape or Clear empties it. Each tab counts the rites that match the search, and the search and tab stay in the address. Built-ins come first, then own rites by name; forgotten rites come most recently forgotten first. Empty collections and unmatched searches are explained. There is no Workshop or Constructs tab.

## use_case_customize_rite

- **Goal:** Write an own rite's replies without changing performances already under way.
- **Steps:** Choose New rite in the Grimoire, or open a rite and make a copy. Edit its name, its first message, its reply order, its reply list and what happens after the last reply. Save, or Cancel to restore the saved fields. Try the rite by performing it on a list ([`use_case_perform_rite`](performances.md#use_case_perform_rite)).
- **Outcome:** Only the owner can edit the rite. A rite has one reply list, which supports adding, editing, removing and reordering, with at least one reply. Each reply can prompt the user with a brainstorming or planning cue. Replies can use placeholders for the rite's name, the list's name and nouns, the message's text and the acting user's name ([`use_case_set_name`](accounts.md#use_case_set_name)). A rite needs a first message, which opens each performance of it and can use placeholders for the rite's name and the list's name. The site writes the messages for stopping and for failed messages from the rite's name and the list's words. Built-in and forgotten rites show their first message, replies and final reply as read-only text. Browser drafts survive navigation until saved or cancelled, unless a newer save makes them outdated. Save reveals and focuses invalid fields. The active performance keeps its rite snapshot when the source changes. The detail page's header shows the rite's seal, whether it is a built-in, own or forgotten rite, its count of replies, its reply order, whether it loops or concludes, and when it was edited or forgotten, with Make a copy and Forget, or Restore and Delete forever once forgotten. A legend beneath the messages explains each placeholder. The Grimoire's Forgotten tab also restores or deletes forgotten rites. Breadcrumbs lead from Home through the Grimoire to the rite's name.

## use_case_reply_order

- **Goal:** Choose whether a rite gives its replies in order or at random.
- **Steps:** Open an own rite. Under Reply order, choose In order, Random, with repeats or Random, without repeats. Save.
- **Outcome:** The reply list numbers its replies for In order and bullets them for either random order. In order gives the replies from the first to the last. Random, with repeats picks any reply each time. Random, without repeats gives each reply once, in a random order, before it gives any again. The read-only page shows the same numbers or bullets and names the order in its header. A new rite is Random, with repeats. Capture is Random, with repeats, and Brainstorm is Random, without repeats.

## use_case_conclude_rite

- **Goal:** End a performance once the rite has given all its replies.
- **Steps:** Open an own rite. Under After the last reply, choose Conclude with a final reply. Write the final reply. Save. Perform the rite and send one message more than the rite has replies.
- **Outcome:** Each reply is given once. The message after the last reply gets the final reply, and the performance ends with its closing message. Its list items stay in the list, and the composer closes. Save refuses a rite that concludes without a final reply, and focuses the field. A final reply can use the same placeholders as the replies. A rite that loops starts its replies again and keeps going until someone chooses Stop. A new rite loops.
