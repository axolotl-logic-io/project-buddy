# Standalone Chat and simplified start actions (#894)

This page is the working contract for issue #894. It lists what the standalone Chat change owns, what it consumes from the foundation (#892) and the quest workspace (#893), and how stale URLs behave.

## Owned here

- **Chat** at `/chat`: one continuing private conversation per user. Opening it never spends batteries, generates an opening or shows a list, a chooser or a conversation name.
- **Start a quest from this**: an explicit action in Chat. It shows an editable name and summary, creates nothing on cancel, and on confirmation creates a quest with that summary as its Journal and opens the quest. The private Chat stays private and keeps its history; no message is copied or moved.
- **Activity and Construct start actions**: a dialog that offers an existing quest, a new quest, or (for an activity) Chat. An existing quest continues its one conversation with the chosen activity or construct. Closing the dialog creates nothing and spends nothing.
- **Old routes**: `/chats/new` and `/chats/[chatId]` stop rendering adventure screens. `/chats/new` resolves to Chat or to the start dialog's destination. `/chats/[chatId]` resolves to the quest that owns the conversation when the viewer can open it, to `/chat` for the viewer's own Chat, and otherwise to not found. A foreign or unknown id never reveals whether it exists.
- Copy, use cases, browser tests and Library chapters for the above.

## Consumed from the foundation (#892)

The standalone Chat adapters call these domain operations and nothing lower:

- get-or-create the viewer's private Chat conversation (read-only on page load);
- get-or-create a quest's conversation;
- change the current construct or activity of a conversation, applying to future replies;
- create a quest with a seeded Journal from a confirmed summary.

Names follow whatever #892 publishes; this page records the agreed names once they land.

## Shared with the quest workspace (#893)

#893 owns the conversation screen and its construct and activity controls. Chat renders the same screen without the quest's Journal, Plan, Progress and Quick Notes, and with its own Start a quest from this action.

## Tool limits

Chat has no quest, so its replies offer no Journal, Plan or milestone writes. The quest-proposal tool stays available because it only proposes; the user confirms.
