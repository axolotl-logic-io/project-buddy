# Notes

A note is a short line that the user saves to a project between chats, without starting one. Notes feed the project's memory, so the buddy knows about them from the project's next reply. The glossary entry is [Note, quick capture](../GLOSSARY.md#note-quick-capture).

## Quick capture

Every signed-in page has a **Note** button in the header, at every screen width. It opens quick capture at `/capture`, which holds a project choice and the note's text. A link with `?projectId=PROJECT_ID` chooses that project; `PROJECT_ID` is the project's id. Otherwise the user's newest project is chosen. A project's page links to quick capture with the project chosen.

Saving calls no model, so it spends none of the user's gold. A saved note clears the text and keeps the project chosen, ready for the next note. The form refuses an empty note, or one longer than 1000 characters, with a message beside the text. Other failures, such as a project that is gone or a database that can't be reached, show a message under the form. In each case the form keeps the typed text.

The form's action is the save's Server Action, so a note saved before the page's script has loaded is posted, never put in the URL. The page comes back with the answer, and with the text and project of a refused or failed note. Such a note is dated with the server's UTC day, since only the script sends the browser's day.

## Notes in the memory

A note is stored in the project's memory, through the memory store and its versions, not in a table of its own. Each note is a paragraph at the end of the memory:

```markdown
Note (2026-11-02): try a subdivision cage on the shell
```

The note's text is tidied to one line, with each run of spaces and line breaks made one space. The date is the day in the user's browser when they saved it. If the browser sends no day, or one more than a day away from the server's UTC day, the server's UTC day is used instead.

Saving a note adds a memory version by the user. The change lands on top of the newest version, so a buddy's change made at the same time is kept. `apps/web/src/notes/note.ts` alone knows the paragraph's format.

## Recent notes

A project's page lists its 10 newest notes, newest first. The list holds every paragraph in the memory written in the note format, including ones the user or the buddy wrote by hand. A note that the buddy rewrites into another form is no longer listed, but its content stays in the memory.

Deleting a note removes its paragraph from the memory as a new version by the user. The memory's history keeps the version before, so restoring that version brings the note back. The delete matches the listed text exactly as the memory holds it, not by the rules for a new note, so a hand-written note with extra spaces, or one longer than 1000 characters, can be deleted too. When the memory no longer holds the note, nothing changes, and the page says that nothing was deleted.
