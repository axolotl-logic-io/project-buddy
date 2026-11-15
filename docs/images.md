# Saved images

Constructs don't generate images, and the composer accepts text only. Images already saved in a conversation, and construct artwork, stay readable. The `look` command shows the Visual description from the conversation's construct snapshot. If that snapshot has no description, it says so.

Saved image delivery (`/api/images/IMAGE_ID` and `/api/generated-images/GENERATION_ID`, where each id names a saved image) checks the acting user's access and returns private, non-cacheable responses. A foreign identifier grants no access.

Conversation images belong to their source conversation. Deleting that conversation, its quest or the account removes its images and their generation records. Construct artwork uses immutable assets and destination grants; deletion releases the destination's grants and collects bytes only after the last grant disappears. Existing copies and conversations keep their artwork. [Construct visuals](construct-visuals.md) describes the artwork contract.
