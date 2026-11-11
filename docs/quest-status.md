# Quest status

A quest starts Active. Its owner can mark it Completed or Abandoned with the visible Complete and Abandon buttons in the quest workspace rail. Both choices keep the conversation, Journal, Quick Notes, progress and memberships available. Members can read and continue the quest but cannot change its status.

Quests has an underlined tab rail for Active, Completed and Abandoned quests, below the four starting points, with Active selected by default. The selected status is kept in the URL. Completed and abandoned cards have Restore quest for the owner; the quest page offers the same action. Restoring returns the quest to Active. A successful change offers Undo, which restores the previous status only if there has been no later status change.

Home features only Active quests. Quest choices, such as Quick Note's and an activity's start, offer only accessible Active quests, including team quests. Completing or abandoning removes a quest from subsequent choices; restoring it makes it available again. An unavailable selection falls back to the newest Active quest in Quick Note. A quest's conversation remains available to continue, including in Completed and Abandoned quests. Status changes and Undo replace previous feedback and focus the current result, including when a restored card leaves the list.

## Construct approval

In a quest's conversation, `request_quest_status` creates a proposal for the current quest. The construct must first verify that the user means the whole quest, rather than a milestone or a moment of frustration. The tool cannot execute a status change. Its card shows the quest and the current and proposed statuses, with explicit approval and decline controls.

Only an authenticated action by the requesting quest owner can approve the saved proposal. The action accepts a proposal id and a decision, rather than a model-supplied status or claim of consent. It locks the quest, verifies the saved status revision, consumes the pending proposal and applies the change in one transaction. Replays, declined proposals and proposals made before any intervening status change cannot apply. An outdated proposal needs a new card. Cards read their saved decisions on opening; the construct receives the quest's current status in subsequent reply context.

## Migration

Migration 0039 adds defaulted status and revision columns to quests and a separate approval table. Existing quests become Active. It is additive and works alongside the earlier build. During the interval when the earlier build is live, that build does not expose status controls.

Reply instructions include the requesting owner’s latest proposal decision in that conversation, read from storage. Pending, declined, approved and outdated states supersede the original tool output; terminal cards cannot be confirmed again. Reading this context changes no status and gives no approval. Other users receive no owner-only proposal context.

## Quest workspace

The quest overview and Quest Journal share a compact header. The title and its pencil appear above the status. The lower rail holds Conversation, Quest Journal, Plan, Progress, Quick Notes, Versions and Members navigation, followed by the owner's status actions. The current section appears below the rail; Conversation, the default, follows the frame at the page's full width, with its pinned header and composer. The current page has an underlined link. Controls wrap on phones.

The owner can choose the pencil to edit the title inline. Save title or Enter saves a trimmed name of up to 80 characters. Cancel title edit or Escape discards the draft, and focus returns to the pencil. Invalid names and storage failures keep the draft open for correction. Members can read the title but cannot edit it.

The overview keeps the conversation, plan, progress timeline, Quick Notes, members and invitations. The Journal keeps its editor and version history. Navigation and title edits start nothing and make no model call.
