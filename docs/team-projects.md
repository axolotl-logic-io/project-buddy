# Team projects

A team project is a project that its owner shares with members. The owner and the members work in it together: they share its chats, project memory, Quick Notes and progress timeline. This page covers who can do what, how access is decided, and what leaving or removal does.

Inviting someone by email and accepting an invitation are in [#628](https://github.com/axolotl-logic-io/project-buddy/issues/628). Who wrote each message is in [#629](https://github.com/axolotl-logic-io/project-buddy/issues/629). Per-user unread marks and spend attribution are in [#630](https://github.com/axolotl-logic-io/project-buddy/issues/630).

## Roles

A project has one owner: the user who made it, `projects.user_id`. Everyone else in the project is a member, with a row in `project_members`.

| Action | Owner | Member |
| --- | --- | --- |
| Read and continue every chat, start chats, rename chats | Yes | Yes |
| Edit project memory, add and delete Quick Notes | Yes | Yes |
| Record, edit and delete milestones | Yes | Yes |
| See the Members section | Yes | Yes |
| Set check-ins | Yes | No |
| Remove a member | Yes | No |
| Leave the project | No | Yes |

The owner can't leave their own project. Transferring ownership is out of scope.

Check-ins stay the owner's: their setting, their email and their gold. A check-in starts a new chat in the project, which members can read like any other chat. It is unread for the owner and every member, and each one's opening clears only their own mark. Only the owner's mark holds the project's next check-in.

Standalone chats, own buddies, own activities, own spells, push subscriptions and each user's image gallery stay private to their user.

In a team project chat, the chosen buddy's and activity's instructions are shared with the project's members. A chat keeps a snapshot of its buddy, and each activity session keeps a snapshot of its activity. So when someone starts a team project chat with an own buddy, or the buddy moves the chat into one of their own activities, that snapshot's instructions become the chat's prompt for every member's replies. The same goes for spells: when the buddy casts one of the replying member's own [spells](spellbook.md), the saved reply keeps the spell's instructions, so they steer the buddy in every later reply in the chat, whoever writes. The site shows no warning for this. The own buddy, activity or spell itself stays private: no one else can open, edit or use it in another chat.

The chat's messages hold only what the chat shows. When the buddy changes the activity, the saved `select_activity` result keeps the activity's id and name, not its instructions, which only that reply's model call receives. `listMessages` also strips the instructions from results saved before this change, without rewriting the stored rows, so the pages never send them to the browser. A `cast_spell` result keeps the spell's instructions in the stored message for the model, which reads the chat with `listMessagesForModel`, but `listMessages`, which every page reads, leaves them out, so other members can't see them. A generated image in a project chat is open to everyone in the project, but only its maker's gallery lists it.

## Access model

`src/accounts/owner-scope.ts` is the only module that decides access. Every store builds its `where` from its predicates and takes the acting user first.

- **Open to** predicates, such as `projectOpenTo`, `chatOpenTo` and `memoryVersionOpenTo`, select what the user's own projects and the team projects they are a member of reach. A standalone chat is open only to the user it names.
- **Owned by** predicates, such as `projectOwnedBy`, select only what the user owns. Owner-only actions use them: the check-in setting and removing a member.
- **Membership** predicates, `projectMemberOpenTo`, `projectMemberOwnedBy` and `membershipOf`, decide who can see, remove and leave a `project_members` row.

A project that isn't open to the user reads as not found, exactly like a project that doesn't exist. Server tests in `test/component-integration/projects/team-project-access.server.test.ts` check each kind of project data as a member, a non-member, a removed member and a member who left.

## Members store

`src/projects/members-store.ts` reads and writes `project_members`:

- `addProjectMember(member, projectId)` makes the user a member. Only accepting a project invitation calls it, since it checks nothing but that the project exists and isn't the user's own.
- `listProjectMembers(user, projectId)` lists the owner first, then the members, in the order they joined. Each person's `email` is undefined unless the user may see it, as described in [Members section](#members-section).
- `removeProjectMember(owner, projectId, member)` takes a member out of the owner's project.
- `leaveProject(member, projectId)` takes the member out of the project.

## Leaving and removal

Leaving or removal deletes the membership row. Access ends at once, because every query checks membership when it runs: a page the person still has open finds nothing when it reloads, and their next message, memory save or milestone edit is refused as not found. The person's past messages stay in the project's chats.

## Members section

The project page lists the owner and the members, each by name, or by email address when they have none, with their role and when they joined.

Who sees an email address depends on the viewer:

- The owner sees each person's name and email address.
- A member sees each person's name, and sees an email address only for someone with no name, so the member can still tell who it is.

`listProjectMembers` applies this rule in its query, so a named person's address never reaches a member's page. The owner sees a Remove button beside each member. A member sees a Leave project button. Each action asks for confirmation first. After a removal, keyboard focus moves to the section's heading. After leaving, the member is taken to their projects list.

The projects list marks a team project "Shared" for its owner and "Shared with you" for a member.

## Migration

Migration 0026 adds the `project_members` table, with a unique index on each project and user pair and an index on the user. It only adds a table, so the live build can run beside it.
