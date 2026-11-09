# Quest status

A quest starts Active. Its owner can mark it Completed or Abandoned through the quest page's Quest actions menu. Both choices keep adventures, Journal, Quick Notes, progress and memberships available, and turn off check-ins. Members can read and continue the quest but cannot change its status.

Quests has Active, Completed and Abandoned tabs, with Active selected by default. The selected status is kept in the URL. Completed and abandoned cards have Restore quest for the owner; the quest page offers the same action. Restoring returns the quest to Active. Check-ins stay off until the owner turns them on. A successful change offers Undo, which restores the previous status only if there has been no later status change.

Home features only Active quests. Quest dropdowns offer only accessible Active quests, including team quests: this applies to the Adventures filter, New adventure and activity forms, and Quick Note selection. Completing or abandoning removes a quest from subsequent choices; restoring it makes it available again. An unavailable selection falls back to All quests in the filter, no quest in New adventure, or the newest Active quest in Quick Note. Existing adventures remain available to continue, including in Completed and Abandoned quests. Status changes and Undo replace previous feedback and focus the current result, including when a restored card leaves the list.

## Construct approval

In a quest adventure, `request_quest_status` creates a proposal for the current quest. The construct must first verify that the user means the whole quest, rather than a milestone or a moment of frustration. The tool cannot execute a status change. Its card shows the quest and the current and proposed statuses, with explicit approval and decline controls.

Only an authenticated action by the requesting quest owner can approve the saved proposal. The action accepts a proposal id and a decision, rather than a model-supplied status or claim of consent. It locks the quest, verifies the saved status revision, consumes the pending proposal and applies the change in one transaction. Replays, declined proposals and proposals made before any intervening status change cannot apply. An outdated proposal needs a new card. Cards read their saved decisions on opening; the construct receives the quest's current status in subsequent reply context.

## Migration

Migration 0039 adds defaulted status and revision columns to quests and a separate approval table. Existing quests become Active. It is additive and works alongside the earlier build. During the interval when the earlier build is live, that build does not expose status controls.

Reply instructions include the requesting owner’s latest proposal decision in that adventure, read from storage. Pending, declined, approved and outdated states supersede the original tool output; terminal cards cannot be confirmed again. Reading this context changes no status and gives no approval. Other users receive no owner-only proposal context.
