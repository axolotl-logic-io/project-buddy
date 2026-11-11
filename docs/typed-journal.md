# Goal and Preferences

A quest's Journal has a typed Goal and Preferences alongside its Plan and
free notes. Only the quest's owner can read or change them. They belong to
the quest's continuing conversation; Chat has none.

The Goal is the agreed outcome, up to 2000 characters. An empty goal means
none is currently recorded. Preferences are an ordered list of up to 30 short
lines, each up to 200 characters. Their stable numbers survive changes of
text and order. Removed numbers are never reused.

## Edit a section

The quest page and Journal show both sections before the other content.
Expand Edit goal or Edit preferences to change them without a model call or
battery use. Section versions list the saved values and whether the construct
or owner saved them. Older free notes and historical versions stay unchanged;
there is no automatic extraction of goals or preferences from Markdown.

In the quest's composer:

| Command | Result |
| --- | --- |
| `/preferences` | Show current preferences |
| `/prefer TEXT` | Add a preference |
| `/preference NUMBER TEXT` | Change its text |
| `/unprefer NUMBER` | Remove it |
| `/move-preference NUMBER BEFORE` | Move it before another number; use `end` for the end |

Commands save a conversation record and do not ask the model for a reply.
They wait while a reply is pending, including a failed reply awaiting retry.

## Construct changes

Every quest reply reads the current Goal and Preferences. `set_goal` sets or
clears the goal. `change_preferences` applies add, change, move and remove
operations together, all or none. The construct is asked to save only agreed
goals and stated preferences. Proposed changes stay in the conversation
until the owner agrees. `update_memory` keeps free notes; it no longer owns
Goals or Preferences. Typed values take precedence over older headings.

Construct changes show the previous and new values with Undo in the
conversation. Owner commands show the resulting preferences and Undo.
Undo also appears in the section's version history. It saves a new version
only while the changed content is still current, so it never overwrites later
edits. A change can be undone once; an undo cannot itself be undone. After a
conflict, read the current section and make the intended change explicitly.

## Storage and compatibility

The additive `journal_versions` table holds independent version sequences for
Goal and Preferences, including before and after values, author and the
version undone. Writes lock the owner's quest and serialize changes. User
forms name their starting version; stale forms save nothing. Existing Journal
and Plan tables keep their formats, so older builds can run beside this
schema. Deploying this schema does not rewrite production content.
