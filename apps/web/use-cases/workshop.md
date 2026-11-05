# Workshop

## use_case_workshop_page

The user makes, customizes, tweaks or clones a construct, activity or spell from one page.

- Given the Workshop, it has a tab for Constructs, Activities and Spells. Constructs shows first; choosing another tab shows that kind instead, and an unknown kind shows Constructs.
- Each tab offers New to write one from scratch, its built-in ones with Customize, and the user's own with Tweak and Clone, as on that kind's own page.
- Each action opens the construct, activity or spell in its Workshop to edit and test, as on that kind's own page.
- The user's own list shows only their own ones; viewing the page changes nothing.

## use_case_workshop_draft

An owner can test an unsaved construct, activity or spell beside its editing form.

- Given an editable definition, when the user tests a changed draft, the reply uses that draft without saving the original.
- Given a completed test, when the user sends a follow-up, it keeps the test conversation.
- Given a tested draft, when its instructions or companion settings change, the result is marked out of date and the next test starts fresh.
- Given example test cases, the user can choose another example or write a message from scratch.
- Activity tests can try the opening request; spell tests distinguish selection from forced casting.
- Tests spend the acting user's gold. Another user's source or companion is not found, and an out-of-gold user cannot start a reply.
- Tests do not save chats, edit definitions or change quest data.
