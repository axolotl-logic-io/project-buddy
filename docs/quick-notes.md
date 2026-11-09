# Quick Notes

A Quick Note is a short line that the user saves to a quest between adventures, without starting one. Quick Notes feed the quest's Journal, so the construct knows about them from the quest's next reply. The glossary entry is [Quick Note](../GLOSSARY.md#quick-note).

## The Quick Note page

Every signed-in page has a **Quick Note** link in the header, at every screen width. It opens the Quick Note page at `/capture`, which holds a quest choice and the Quick Note's text. A link with `?projectId=PROJECT_ID` chooses that quest; `PROJECT_ID` is the quest's id. Only accessible Active quests, including team quests, are offered. Otherwise the user's newest Active quest is chosen. A link or saved choice for a Completed, Abandoned or inaccessible quest falls back to the newest Active quest. With none, the page links to Quests to start or restore one. Restoring a quest makes it available again. A quest's page links to the Quick Note page with the quest chosen.

Saving calls no model, so it spends none of the user's gold. A saved Quick Note clears the text and keeps the quest chosen, ready for the next one. The form refuses an empty Quick Note, or one longer than 1000 characters, with a message beside the text. Other failures, such as a quest that is gone or a database that can't be reached, show a message under the form. In each case the form keeps the typed text.

The form's action is the save's Server Action, so a Quick Note saved before the page's script has loaded is posted, never put in the URL. The page comes back with the answer, and with the text and quest of a refused or failed Quick Note. Such a Quick Note is dated with the server's UTC day, since only the script sends the browser's day.

## Quick Notes in the Journal

A Quick Note is stored in the quest's Journal, through the memory store and its versions, not in a table of its own. Each Quick Note is a paragraph at the end of the Journal, which keeps the `Note` prefix:

```markdown
Note (2026-11-02): try a subdivision cage on the shell
```

The Quick Note's text is tidied to one line, with each run of spaces and line breaks made one space. The date is the day in the user's browser when they saved it. If the browser sends no day, or one more than a day away from the server's UTC day, the server's UTC day is used instead.

Saving a Quick Note adds a Journal version by the user. The change lands on top of the newest version, so a construct's change made at the same time is kept. `apps/web/src/notes/note.ts` alone knows the paragraph's format.

## Recent Quick Notes

A quest's page lists its 10 newest Quick Notes, newest first, under **Quick Notes**. The list holds every paragraph in the Journal written in the Quick Note format, including ones the user or the construct wrote by hand. A Quick Note that the construct rewrites into another form is no longer listed, but its content stays in the Journal.

Deleting a Quick Note removes its paragraph from the Journal as a new version by the user. The Journal's history keeps the version before, so restoring that version brings the Quick Note back. The delete matches the listed text exactly as the Journal holds it, not by the rules for a new Quick Note, so a hand-written Quick Note with extra spaces, or one longer than 1000 characters, can be deleted too. When the Journal no longer holds the Quick Note, nothing changes, and the page says that nothing was deleted.

Unsaved Journal edits and Quick Notes stay in this browser for the signed-in user and quest. Discard changes removes them. A Journal draft based on an older saved version is dropped on return. A Quick Note quest that is no longer accessible is not restored. Browser storage is local to this device and can be read by someone using the same browser profile.
