# Saved images

Image generation and the Image gallery have been removed. Constructs cannot generate images, and the Workshop saves a Visual description without generating replacement artwork or spending batteries. The `look` command shows the Visual description from the conversation’s construct snapshot. If that snapshot has no description, it says so.

Existing conversation images and construct artwork remain readable. Uploads remain available. Saved image delivery checks the acting user's access and returns private, non-cacheable responses. A foreign identifier grants no access.

Conversation images belong to their source conversation. Deleting that conversation, its quest or the account removes its images and generation metadata without refunding prior spending. Construct artwork uses immutable assets and destination grants; deletion releases the destination’s grants and collects bytes only after the last grant disappears. Existing copies and conversations keep their artwork.

Legacy generation tables, accounting and saved tool-result schemas remain for existing data. No destructive schema migration accompanies this removal.
