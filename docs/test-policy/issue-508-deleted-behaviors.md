# Deleted behavior checks for #508

Companion to [the policy and validation record](issue-508.md). Paths are relative to `apps/web/`. This is the complete removed-title ledger, including direct-call checks removed from mixed filesystem suites. Titles and parameterized templates are preserved from the pre-deletion source; they are not runtime test counts. A retained same-subject suite does not establish that each removed branch remains covered. Treat every removed check here as coverage lost unless the policy record identifies actual retained assertions. No replacement coverage is claimed or added.

The 70 rendered-UI files approved for deletion are labeled **jsdom rendered UI**. The other deleted `.tsx` file, `tool-parts.test.tsx`, checked a registry without rendering.

## `playwright.config.test.ts`

- e2e projects › run the auth tests apart from the screenshots, each with the others
- the e2e web server › uses supplied port %s for the browser and server
- the e2e web server › refuses a missing or blank supplied port (%s)
- the e2e web server › send from the address the runner expects

## `scripts/build-font-urls.test.ts`

- check:build-fonts › passes a build whose @font-face files are the map's
- check:build-fonts › fails a build that hashes a font file differently
- check:build-fonts › fails a build with a font file the map lacks
- check:build-fonts › fails a build whose variable names another typeface's family
- check:build-fonts › fails when there is no built CSS

## `scripts/release/smoke-checks-sequential.test.ts`

- smokeChecks starts no request while reading an answer
- smokeChecks reports a body read failure for %s and continues

## `scripts/release/smoke-checks.test.ts`

- smokeChecks passes a healthy site without following redirects
- smokeChecks accepts an absolute redirect to /login
- smokeChecks reports %s answering %o
- %s needs the sign-in label and destination on the same link
- %s does not accept an explanation present only in inert source text
- %s does not accept a sign-in anchor present only in inert source text
- %s accepts real page markup alongside streaming comments and scripts
- smokeChecks reports every failing check
- withProtectionBypass adds the bypass header and keeps the others
- withProtectionBypass sends no bypass header with %s

## `scripts/test-db/test-database.test.ts`

- checkTestDatabase accepts › a database on localhost, by name
- checkTestDatabase accepts › a database on 127.0.0.1
- lane database names › accepts the supplied local database %s
- checkTestDatabase refuses › a value that is not a URL
- the connection boundary refuses › a non-Postgres scheme or driver routing override
- ambiguous connection strings › raw delimiters that the driver parses differently from a Postgres URL
- ambiguous connection strings › encoded whitespace and backslashes in credentials remain valid
- database identifiers and connection options › an identifier Postgres would truncate into another database
- database identifiers and connection options › canonicalizes encoded names before driver use and reserved checks
- database identifiers and connection options › duplicate connection options and absent credentials
- unsafe databases › a production-shaped URL from the Neon integration
- unsafe databases › any other Neon database
- unsafe databases › a database on another machine
- unsafe databases › the server's own databases, which a reset must not drop
- unsafe databases › a server with no database supplied
- unsafe databases › a database name that SQL would need to quote
- refuses an environment whose raw authority would send tests to another host
- checkTestEnvironment › returns the test database when the tutor runs its mock model
- checkTestEnvironment › checks the database it is given in place of DATABASE_URL's
- checkTestEnvironment › refuses to run with DATABASE_URL missing or blank
- checkTestEnvironment › refuses a database that is not the local test database
- checkTestEnvironment › refuses to run with TUTOR_MODEL unset, which means Claude
- checkTestEnvironment › refuses to run with the tutor on Claude
- checkTestEnvironment's email › refuses to run unless email goes to the outbox
- checkTestEnvironment's email › refuses to run without the outbox's folder
- checkTestEnvironment's email › refuses the outbox on a production deployment

## `test/accounts/invitations.test.ts`

- a storage failure saving an invitation sends no email and is reported as a retryable failure to the admin
- unavailable invitation accounting refuses delivery and reports failure
- failure looking up an address cannot be treated as a successful send
- an activation failure after email acceptance is reported as failure, not success

## `test/accounts/login-links-reading.test.ts`

- readLoginLinkUser › reads the link's user, with her hidden extras
- readLoginLinkUser › is undefined when no link matches the token
- readLoginLinkUser › reads nothing for a token of the wrong form
- the link's lifetime › is the one the pages and the email name

## `test/accounts/login-links.test.ts`

- requestLoginLink for an account › counts the request against the rate limits, and emails nothing before answering
- requestLoginLink for an account › after the response, saves a link and emails it
- requestLoginLink for an account › makes each link with its own token
- requestLoginLink's link › leads to the production domain on Vercel, whatever the request says
- requestLoginLink's link › leads to the request's host when the request has no origin
- requestLoginLink sending nothing › for an address with no account, when signing in
- requestLoginLink sending nothing › past the rate limits, and schedules nothing
- requestLoginLink sending nothing › throws the storage case when the counts can't be saved
- requestLoginLink logging what it couldn't send › logs Resend's problem, without the address, the token or its hash
- requestLoginLink logging what it couldn't send › logs an unreachable database as retryable

## `test/accounts/owner-scope-coverage.test.ts`

- $path › every export is checked for an owner filter, or allowed without one
- $path › %s reads and writes only the owner's data

## `test/accounts/owner-scope-test-kit.test.ts`

- which of a call's queries are not the owner's › a query holding an owner predicate is the owner's
- which of a call's queries are not the owner's › a query on the same rows without the predicate is not
- which of a call's queries are not the owner's › a row inserted with the owner in its values is the owner's, and so is a row under it
- which of a call's queries are not the owner's › a row inserted for another user is not the owner's, nor a row under it
- which of a call's queries are not the owner's › a row under one the call did not insert is not the owner's
- which exports are not checked once › names an export that is neither checked nor allowed
- which exports are not checked once › names an export that is both, and entries that are no export

## `test/accounts/rate-limits.test.ts`

- countLoginLinkRequest throws the storage case when the database is unreachable

## `test/accounts/user-name.test.ts`

- checkUserName › returns the name trimmed
- checkUserName › clears the name for %s
- checkUserName › accepts a name of exactly the longest length
- checkUserName › refuses a name one character too long
- checkUserName › refuses a name with %s
- checkUserName › refuses a name with %s

## `test/accounts/users-prompt-preferences.test.ts`

- prompt preferences › reads name and saved switches together for the owner
- prompt preferences › an unnamed account keeps its saved switches
- prompt preferences › an absent account has no name or switches

## `test/accounts/users-store.test.ts`

- normalizeEmail › trims the address and lower-cases it
- finding a user by email › reads the account's row as a user
- finding a user by email › returns undefined for an address with no account
- readSessionUser › reads the user's row as a user
- readSessionUser › a user with no name has an undefined name
- readSessionUser › returns undefined when no user has that id at that epoch
- readUserName › reads the user's name
- readUserName › a null name is undefined
- readUserName › a missing user has no name
- user store failures › %s rejects with a logged AppError when Postgres rejects the query

## `test/app/(workspace)/account/actions.test.ts`

- signOutAction › clears this browser's session, then shows the sign-in page
- signing out everywhere › ends every session of hers, clears this one, then shows the sign-in page
- signing out everywhere › keeps the session when her sessions can't be ended
- setNameAction refusing › refuses a name with %s, saving nothing
- setNameAction refusing › a form with no name field is not found
- setNameAction refusing › a signed-out request saves nothing

## `test/app/(workspace)/account/layout.test.tsx`

**jsdom rendered UI**

- Account layout › heads the page, and offers both ways to sign out below the usage
- use_case_see_monthly_usage › switching the meter off leaves both ways to sign out

## `test/app/(workspace)/account/name-form.test.tsx`

**jsdom rendered UI**

- use_case_set_name › a refused name stays in the field, with why
- use_case_set_name › a saved name stays in the field, and says it is saved

## `test/app/(workspace)/account/page.test.tsx`

**jsdom rendered UI**

- Account page › shows her own spend this month
- Account page › her name field shows her saved name
- Account page › her name field is empty when she has no name, and says what {{name}} does

## `test/app/(workspace)/account/sign-out-buttons.test.tsx`

**jsdom rendered UI**

- SignOutButtons › signs this browser out at once
- SignOutButtons › signs out everywhere once she confirms, saying what it does
- SignOutButtons › signs nothing out when she cancels

## `test/app/(workspace)/account/usage-amounts.test.ts`

- usageAmounts › states the spend and the limit in cents and in dollars and cents
- usageAmounts › shows no spend as nothing
- usageAmounts › rounds any spend up to the cent, so a fraction of a cent shows
- usageAmounts › under the limit, shows a cent less than it at most
- usageAmounts › shows the limit once the spend reaches it, and the spend past it

## `test/app/(workspace)/account/usage-meter.test.tsx`

**jsdom rendered UI**

- UsageMeter › states the spend out of the limit, and the reset day in UTC
- UsageMeter › shows the spend on a meter named by its heading
- UsageMeter › past the limit, states the spend, and fills the meter
- use_case_see_monthly_usage › the meter tells a screen reader the spend out of the quota

## `test/app/(workspace)/buddies/(list)/page.test.tsx`

**jsdom rendered UI**

- is titled Buddies and links home
- lists the six built-in buddies and her own
- says she has none of her own yet
- offers to customize each built-in buddy, by its id
- offers to tweak each of her own buddies in place
- offers to clone each of her own buddies, by its id

## `test/app/(workspace)/buddies/[buddyId]/page.test.tsx`

**jsdom rendered UI**

- use_case_customize_built_in_buddy › shows a built-in buddy's parts read-only, with Customize
- use_case_customize_built_in_buddy › puts the mechanics parts, and only them, in the persona-mechanics extra
- shows her buddy's name and every part to edit, each with a reset
- warns that a mechanics part can break citations, memory or search
- says {{name}} becomes her name in the parts of the system prompt alone
- shows the parts no buddy changes
- puts the mechanics parts and their resets, and only them, in the persona-mechanics extra

## `test/app/(workspace)/buddies/actions.test.ts`

- cloneBuddyAction cloning › an unknown source redirects to the buddies page
- cloneBuddyAction refusing › clones nothing when the form names no source, or a file
- cloneBuddyAction refusing › clones nothing for a signed-out request
- cloneBuddyAction refusing › throws a storage failure on to the error boundary

## `test/app/(workspace)/buddies/edit-actions.test.ts`

- saveBuddyAction › saves nothing without a name or a part, or signed out
- resetBuddyPartAction › changes nothing for an unknown or foreign buddy, or no part
- editBuiltInBuddyAction › clones nothing for an id that is not a built-in buddy's

## `test/app/(workspace)/chat/page.test.tsx`

**jsdom rendered UI**

- standalone chat hub › links each previous chat to its page
- standalone chat hub › the picker defaults to Hippy and offers her own buddies
- standalone chat hub › heads the chat hub and links home
- offers a new chat without requiring a project
- lists standalone chats without owning any projects (URL choice %s)
- the chats list's heading › heads the list of previous chats Chats
- a signed-out project URL reads no chat, project or buddy choices
- project filtering leaves existing chat controls independent › keeps an empty owned project selected without retrying an unfiltered query
- project filtering leaves existing chat controls independent › a selected project belongs only to the GET filter, not the new-chat form
- use_case_filter_chats_by_project › renders an owned URL choice and submits it with native GET navigation
- use_case_filter_chats_by_project › \`falls back to All for ${JSON.stringify(project)}\`
- use_case_chat_project_badge › a named standalone chat has no badge beside an unnamed project chat
- use_case_chat_project_badge › preserves a named conversation's accessible link name with filter %s
- use_case_chat_project_badge › shows project context only outside project chat links

## `test/app/(workspace)/chats/[chatId]/actions.test.ts`

- renameChatAction › renames the chat to her name, trimmed, and shows the page again
- renameChatAction › is not found for a malformed chat id
- renameChatAction › sends a signed-out request to sign in, renaming nothing
- renameChatAction refusals › refuses %s, saying why and renaming nothing

## `test/app/(workspace)/chats/[chatId]/page.test.tsx`

**jsdom rendered UI**

- Chat page › pins a link back to the project and a heading with a fallback name and the buddy
- Chat page › links a standalone conversation back to the chat list
- Named chat page › heads a named chat with its name, and offers it for renaming
- Chat page lookups › reads the signed-in user's chat and its messages
- use_case_breadcrumbs_in_long_chat › only the chat page has a phone's keyboard shrink the page

## `test/app/(workspace)/chats/[chatId]/rename-chat-form.test.tsx`

**jsdom rendered UI**

- RenameChatForm › is folded away until she opens it
- RenameChatForm › offers the chat's name to change, one line of the longest length
- RenameChatForm › starts empty for a chat with no name yet
- use_case_rename_chat › a name of spaces shows the action's message and keeps her text
- RenameChatForm answers › shows a new name from the page in a field she hasn't changed

## `test/app/(workspace)/chats/actions.test.ts`

- startChatAction starting › passes the project id on in lowercase
- startChatAction refusing › asks for a buddy when it is unknown or missing
- startChatAction refusing › asks for a project when it is missing or its id is not a UUID
- startChatAction failing › throws a storage failure on to the error boundary

## `test/app/(workspace)/chats/new/layout.test.tsx`

**jsdom rendered UI**

- New chat layout › links back to all projects and shows the Start a chat heading

## `test/app/(workspace)/chats/new/page.test.tsx`

**jsdom rendered UI**

- New chat page › preselects the project named in the search parameters
- New chat page › preselects the project named by its id in capitals
- New chat page › preselects the first project for %s
- New chat page › ignores a repeated project parameter

## `test/app/(workspace)/layout.test.tsx`

**jsdom rendered UI**

- Workspace layout › renders the page and leaves the main landmark to the root layout

## `test/app/(workspace)/projects/(list)/layout.test.tsx`

**jsdom rendered UI**

- use_case_view_projects › links home and shows the Projects heading
- use_case_view_projects › heads the list Projects
- use_case_view_projects › offers the new-project form above the list
- use_case_new_project_with_buddy › offers the built-in buddies without waiting for her own

## `test/app/(workspace)/projects/(list)/page.test.tsx`

**jsdom rendered UI**

- use_case_view_projects › links each of her projects, in the store's order
- use_case_view_projects › says she has none yet

## `test/app/(workspace)/projects/[projectId]/(overview)/layout.test.tsx`

**jsdom rendered UI**

- Project layout › links back to all projects above the project

## `test/app/(workspace)/projects/[projectId]/(overview)/page.test.tsx`

**jsdom rendered UI**

- use_case_open_project › shows the project's name, a start-chat link and its chats
- use_case_open_project › says a project with no chats has none
- use_case_open_project › links to the project's memory page
- use_case_open_project › is not found for an unknown project
- use_case_resume_interview › links back to the project's interview chat
- use_case_resume_interview › has no interview link when the project has no interview chat

## `test/app/(workspace)/projects/[projectId]/memory/actions.test.ts`

- saveMemoryAction › is not found for a malformed project or version
- memory form versions › is not found for the version %j, which is not plain digits
- restoreMemoryAction › says when the memory changed since the page loaded
- restoreMemoryAction › is not found for a version the project lacks

## `test/app/(workspace)/projects/[projectId]/memory/memory-editor.test.tsx`

**jsdom rendered UI**

- use_case_edit_memory › saves her text based on the version it shows
- use_case_edit_memory › shows a newer version when she has not changed the text
- use_case_memory_edit_conflict › says a refused save was refused, and keeps her text
- use_case_memory_edit_conflict › keeps her unsaved text when a newer version arrives, now based on it

## `test/app/(workspace)/projects/[projectId]/memory/memory-history.test.tsx`

**jsdom rendered UI**

- use_case_tutor_updates_memory › shows the tutor's change as a version by the tutor
- use_case_undo_memory_change › marks the newest version, and offers to restore each earlier one

## `test/app/(workspace)/projects/[projectId]/memory/page.test.tsx`

**jsdom rendered UI**

- use_case_view_memory › lists history entries in store order
- use_case_view_memory › shows the newest memory formatted, and her editor holding its text
- use_case_view_memory › says when nothing is saved yet, and offers an empty editor
- use_case_view_memory › says nothing is saved while the newest version is only whitespace
- Memory page lookups › reads the signed-in user's project and its memory
- Memory page lookups › an unknown project is not found before reading history

## `test/app/(workspace)/projects/[projectId]/memory/restore-version-form.test.tsx`

**jsdom rendered UI**

- use_case_undo_memory_change › restores the version once she confirms, based on the newest
- use_case_undo_memory_change › restores nothing when she cancels
- use_case_undo_memory_change › says when a newer version refused the restore

## `test/app/(workspace)/projects/actions.test.ts`

- createProjectAction refusing › asks for a name when it is blank
- createProjectAction refusing › asks for a name when the form has none, or a file for it
- createProjectAction refusing a buddy › asks for one of her buddies, creating nothing, for %s
- createProjectAction failing › throws a storage failure on to the error boundary

## `test/app/(workspace)/settings/flag-switches.test.tsx`

**jsdom rendered UI**

- FlagSwitches › offers one switch per extra, labelled and described, in the registry's order
- FlagSwitches choices › shows every extra as on until she hides one
- FlagSwitches choices › shows the extras the page hides as off
- FlagSwitches choices › switches when she clicks the label's words too
- FlagSwitches saving › saves each switch's choice to her account

## `test/app/(workspace)/settings/page.test.tsx`

**jsdom rendered UI**

- Settings page › is titled Settings and links home
- Settings page › offers a switch for each extra under the Extras heading
- Settings page › leaves the main landmark to the root layout

## `test/app/@header/error.test.tsx`

**jsdom rendered UI**

- Header links error › shows nothing, leaving the problem to the page

## `test/app/api/chat/route.test.ts`

- POST /api/chat › hands the signed-in user's chat request to the tutor and returns its response
- POST /api/chat › answers 400 with the unknown case, unlogged, for %s
- POST /api/chat signed out › answers 401 with the signed-out case, unlogged, asking the tutor nothing
- POST /api/chat signed out › answers 500 with the failure's case when reading the user fails
- POST /api/chat's duration › lets a reply run as long as its claim on the message lasts

## `test/app/error.test.tsx`

**jsdom rendered UI**

- ErrorBoundary › shows the case message of an AppError, read from its digest
- ErrorBoundary › shows the case message for a redacted server error that kept the digest
- ErrorBoundary › shows the unknown message for any other error, never its text
- ErrorBoundary › retries, and links back to the projects
- ErrorBoundary on a build older than the server's › reloads once for a digest naming a case this build doesn't know, showing the unknown message
- ErrorBoundary on a build older than the server's › doesn't reload for a case this build knows or a digest Next made

## `test/app/layout-first-paint.test.tsx`

**jsdom rendered UI**

- use_case_choose_theme › the first HTML carries the default theme, and the pre-paint script in its head
- use_case_choose_theme › the first paint shows the saved choice: $name

## `test/app/loading-pages.test.tsx`

**jsdom rendered UI**

- $path shows a labelled busy status

## `test/app/login/actions.test.ts`

- requestLoginLinkAction › asks for a link to the trimmed address and says to check her email
- requestLoginLinkAction › refuses %s, asking for nothing
- requestLoginLinkAction failing › rethrows any other failure

## `test/app/login/link-request-form.test.tsx`

**jsdom rendered UI**

- LinkRequestForm › sends the address, then confirms the invitation was sent
- LinkRequestForm › shows an invalid address on its field, keeping the address
- LinkRequestForm failing › shows a failure in an alert

## `test/app/login/link/actions.test.ts`

- continueSignInAction › signs the browser in as the link's user for 30 days, then shows the home page
- continueSignInAction › shows the link's page again, which says it expired, for a link that no longer works
- continueSignInAction › reads a missing token as an empty one
- continueSignInAction › signs no one in when the link can't be read
- continueSignInAction and her hidden extras › copies her account's hidden extras into this browser before showing the home page
- continueSignInAction and her hidden extras › copies nothing for a link that no longer works

## `test/app/login/link/page.test.tsx`

**jsdom rendered UI**

- LoginLinkPage › asks her to continue, sending the link's token, for a link that works
- LoginLinkPage › says the link has expired, with a link to ask for a new one
- LoginLinkPage › reads a %s token as an empty one
- LoginLinkLoading › says the link is being checked

## `test/app/login/page.test.tsx`

**jsdom rendered UI**

- Login page › asks for her email address alone, and links to the sign-up page
- Login page › leaves the main landmark to the root layout

## `test/app/not-found.test.tsx`

**jsdom rendered UI**

- use_case_open_missing_page › says the project or chat can't be found, and links to the projects

## `test/app/page.test.tsx`

**jsdom rendered UI**

- Home page › shows the site heading and tagline
- Home page › names the two lists' links Projects and Chats
- Home page › leaves the main landmark to the root layout

## `test/app/setup/page.test.tsx`

**jsdom rendered UI**

- SetupPage › asks the recipient to confirm setup, sending the link's token, for a link that works
- SetupPage › says the link cannot be used, with a link to sign in
- SetupPage › reads a %s token as an empty one
- SetupLoading › says the link is being checked

## `test/app/signup/actions.test.ts`

- legacy sign-up refuses even a submitted shared code: %s

## `test/app/signup/page.test.tsx`

**jsdom rendered UI**

- Sign-up page › requires an admin invitation, offers sign-in, and has no sign-up form

## `test/auth/client-key.test.ts`

- clientKeyFromHeaders › uses the first address in x-forwarded-for
- clientKeyFromHeaders › falls back to a shared key when no address is known
- clientKeyFromHeaders › falls back to the shared key for a blank first address

## `test/auth/current-user.test.ts`

- currentUser › is undefined without a valid cookie, without reading any user
- requireUser › redirects a signed-out request to the sign-in page

## `test/auth/hmac.test.ts`

- hmacSha256 › gives RFC 4231's known answer
- constantTimeEqual › accepts the exact string
- constantTimeEqual › rejects a different string

## `test/auth/session-token.test.ts`

- session tokens › hold the user id, the epoch, the expiry and a base64url signature
- session tokens › read back as their user and epoch before they expire
- session tokens › read as nothing when signed with a different secret
- session tokens › read as nothing once they expire
- session tokens › read as nothing when their %s was changed
- malformed session tokens › read as nothing when %s
- sessionCookie › is a Secure, HttpOnly, Lax session cookie for the whole site that lasts 30 days

## `test/buddies/buddies.test.ts`

- buddy registry › lists exactly the six built-in buddies
- buddy registry › uses each character's display name
- buddy registry › defaults to Hippy
- buddy registry › returns the buddy for every id
- buddy registry › recognizes only registered ids
- buddy $id › has a name and every part of the prompt, as text
- buddy $id › has no {{name}} placeholder in any part
- buddy $id › has a voice with sample lines, and its own teaching rules
- buddy $id › starts from the shared rules
- buddy $id › renders a system-prompt fragment with its voice, then every rule
- shared buddy rules › keeps steps, menu paths, shortcuts and citation links exact
- shared buddy rules › leaves citations to the app

## `test/buddies/buddy-parts-schema.test.ts`

- stored buddy parts › lacking the central chat part read it as the default buddy's text
- stored buddy parts › keep their own central chat part
- stored buddy parts › lacking the new project tool part read it as the default buddy's text
- stored buddy parts › keep their own new project tool part
- stored planning skills › old buddy and chat snapshots gain only the missing skill defaults
- stored planning skills › missing either skill leaves the supplied other skill unchanged
- stored planning skills › keeps custom and deliberately empty skill text
- stored planning skills › rejects an invalid supplied %s instead of silently defaulting it
- stored planning skills › lacking any other part are not a buddy's parts
- a stored $key with its other skill missing › keeps intentionally empty text while defaulting only the missing skill
- a stored $key with its other skill missing › rejects a supplied $label instead of defaulting it

## `test/buddies/buddy-store.test.ts`

- buddy store reads › listBuddies reads the owner's buddies
- buddy store reads › listBuddies skips a buddy whose stored parts are not every part
- buddy store reads › an old buddy missing skill parts keeps its own text and gains defaults
- buddy store reads › getUserBuddy finds a malformed id nowhere, without a query
- buddy store cloneBuddy › saves nothing for an id that is no buddy
- buddy store failures › rejects with a logged AppError when the database is unreachable

## `test/buddies/own-buddy-choices.test.ts`

- ownBuddyChoices › lists her own buddies by id and name alone, leaving their parts behind

## `test/buddies/part-defaults.test.ts`

- buddy part keys › name every part once
- buddy part keys › recognise a part's key and nothing else
- buddy part keys › mark the mechanics parts, not the role, voice or teaching rules
- buddy part keys › put the central chat after the interview, as a part of the system prompt
- a part's default › is the voice and teaching rules of the built-in buddy it was cloned from
- a part's default › is Hippy's voice and teaching rules for a clone of her own buddy, or of nothing
- a part's default › is every buddy's default for each other part, whatever it was cloned from

## `test/buddies/personas-redirect.test.ts`

- use_case_view_buddies › old /personas addresses redirect permanently to /buddies

## `test/chats/chat-name.test.ts`

- parseChatName › returns one line of text, trimmed
- parseChatName › accepts a name of exactly the longest length
- parseChatName › returns undefined for %s
- checkChatName › accepts a name as parseChatName does, trimmed
- checkChatName › refuses %s, saying why

## `test/chats/start-chat.test.ts`

- $kind opening preferences › a failed account read stops the opening without saving anything
- $kind opening preferences › exhausted quota still refuses an opening even if preferences are unavailable

## `test/chats/store-buddies.test.ts`

- legacy chat row decoding › a chat before snapshots uses its built-in buddy or the default: %s
- legacy chat row decoding › an old snapshot missing skill parts retains its own other text and gains defaults
- legacy chat row decoding › a snapshot missing a part falls back to the built-in buddy
- legacy chat row decoding › an invalid stored chat name reads as no name

## `test/chats/store-messages.test.ts`

- listMessages skips invalid role and parts rows, logging their IDs without private text

## `test/components/chat-list-project-badges.test.tsx`

**jsdom rendered UI**

- ChatList shared projects › shows a badge on every card even when chats share a project
- ChatList late opt-in › can opt in after rendering without changing the conversation or started time
- ChatList badge presentation updates › shows markup-like project names as literal text outside the link
- ChatList badge presentation updates › reflects supplied name changes and removes badges when disabled

## `test/components/chat-list.test.tsx`

**jsdom rendered UI**

- ChatList › links each chat by its buddy's name
- ChatList › says when each chat started, after its buddy's name
- ChatList supplied project names › shows each supplied project name on its own card, preserving links and times
- ChatList opt-in project badges › hides project names when the option is $label
- ChatList project badge links › shows the project name outside the conversation link $linkName
- ChatList chats without project names › shows no project badge for a central chat
- ChatList chats without project names › accepts project-list data without looking up a project name
- ChatList names › links a named chat by its name and buddy, then says when it started
- ChatList names › reads as listTitle, with the name's part tagged as the chat-names extra
- ChatList names › says so when the project has no chats

## `test/components/chat-project-filter.test.tsx`

**jsdom rendered UI**

- chat project filter › labels the project field and defaults to All
- chat project filter › offers only All followed by the supplied projects in supplied order
- selects $id when two projects have the same name
- chat project filter selection › falls back to All for an unrecognized project id
- chat project filter server markup › preserves full project names as text, including markup characters
- chat project filter server markup › keeps each label associated with its own field when reused
- chat project filter without projects › offers All alone when there are no projects (selection %s)
- chat project filter submission › submits to /chat by GET with an enabled Show chats button

## `test/components/chat-view-citations.test.tsx`

**jsdom rendered UI**

- use_case_ask_blender_question › the links show under the streamed answer, though it cited first
- use_case_ask_blender_question › the links show under the saved answer, each naming its page and heading
- use_case_follow_citation › each saved link opens its section of the latest manual in a new tab

## `test/components/chat-view-newer-build.test.tsx`

**jsdom rendered UI**

- ChatView on a build older than the server's › reloads the page once for a case this build doesn't know
- ChatView on a build older than the server's › doesn't reload for the unknown case

## `test/components/chat-view-quota-refusal.test.tsx`

**jsdom rendered UI**

- ChatView quota refusal › takes back the refused message, with no empty reply, and gives her its text back
- ChatView quota refusal › keeps what she typed after sending instead of the refused text
- ChatView quota refusal › leaves the message and the box alone for any other failure
- ChatView quota refusal in an empty chat › leaves an empty chat empty when its first message is refused
- ChatView quota refusal in an empty chat › clears the refusal's alert when she sends again

## `test/components/chat-view-reopen.test.tsx`

**jsdom rendered UI**

- use_case_reopen_chat › shows every message in order, each reply under the buddy's name
- use_case_reopen_chat › replies keep their formatting
- use_case_reopen_chat › she can send a new message

## `test/components/chat-view-send-message.test.tsx`

**jsdom rendered UI**

- use_case_send_message › an empty message can't be sent
- use_case_send_message › her message shows at once, the tutor thinks, then the reply follows under the buddy's name
- use_case_send_while_tutor_replies › the second tab shows her new exchange after the message still awaiting its reply

## `test/components/chat-view-tool-failure.test.tsx`

**jsdom rendered UI**

- use_case_tutor_updates_memory › a malformed memory edit shows the failure line in the live reply

## `test/components/chat-view.test.tsx`

**jsdom rendered UI**

- ChatView conversation › sends only the new message with the chat id and streams the reply
- ChatView message text › shows each text part of a reply in order, without its reasoning
- ChatView message text › keeps text after a tool call after it
- ChatView errors › shows the message for the error case the stream reports
- ChatView errors › shows the message for the error case in a failed response
- ChatView errors › shows the unknown message instead of any other error text
- ChatView errors › says she was signed out, with a sign-in link, when the proxy refuses
- ChatView answered already › reloads the saved conversation when the message was answered already
- ChatView answered already › reloads nothing for any other failure

## `test/components/chat/chat-error.test.tsx`

**jsdom rendered UI**

- ChatError › links to the sign-in page when she was signed out
- ChatError › when her quota is used up, names the day the server said it resets, whatever her clock says
- ChatError › when her quota is used up and the server named no reset, names no day
- ChatError › shows the unknown message for any other text
- use_case_reply_fails › a reply that failed as %s shows that case's own message

## `test/components/chat/chat-message.test.tsx`

**jsdom rendered UI**

- ChatMessage citations › shows the citations under the prose when they arrived first
- ChatMessage citations › shows the citations under the prose when they arrived last
- ChatMessage tool placement › shows a part whose entry is placed under the prose after it
- ChatMessage tool placement › shows a part whose entry is placed inline where it arrived
- ChatMessage › shows the user's own text exactly as typed, marks included
- ChatMessage while the tutor replies › says the buddy is thinking until the reply starts
- ChatMessage while the tutor replies › marks the reply busy until the tutor has finished it
- a saved call to an unregistered tool shows no tool line

## `test/components/chat/create-project-part.test.tsx`

**jsdom rendered UI**

- CreateProjectPart for a call that answered › says the project was created and links to its interview chat
- CreateProjectPart for a call that answered › says Claude is unavailable, with no link
- CreateProjectPart for a call that answered › says the quota is used up, with the day it resets
- CreateProjectPart for a call that failed or can't be read › says the project wasn't created when the tool call failed
- CreateProjectPart for a call that failed or can't be read › shows nothing for output it can't read

## `test/components/chat/manual-citations-part.test.tsx`

**jsdom rendered UI**

- ManualCitationsPart › links each cited section, by label, to open in a new tab, as each link's description says
- ManualCitationsPart › shows nothing without citations, before they arrive or when malformed
- ManualCitationsPart › links nothing that isn't a manual URL

## `test/components/chat/memory-change-part.test.tsx`

**jsdom rendered UI**

- MemoryChangePart › shows a saved change apart from the tutor's words, with what it removed and added
- MemoryChangePart › says when the change did not apply
- MemoryChangePart › says the update failed when the tool call failed

## `test/components/chat/search-manual-part.test.tsx`

**jsdom rendered UI**

- SearchManualPart › says what the tutor is searching for while it searches
- SearchManualPart › says what the tutor searched for once the search is done
- SearchManualPart › shows nothing while the query is still arriving

## `test/components/chat/tool-parts.test.tsx`

- TOOL_PARTS › has a part for every tool the tutor may call in a %s chat
- TOOL_PARTS › makes a note of the text before a search of the manual
- TOOL_PARTS › leaves the text before a change to the memory as prose
- TOOL_PARTS › shows the manual citations under the message
- TOOL_PARTS › shows a new project under the message

## `test/components/chat/working-note-rule.test.ts`

- isWorkingNote for text before an inline tool part › is true for the tutor's text before a search
- isWorkingNote for text before an inline tool part › is true for text between two searches
- isWorkingNote for text before an inline tool part › is true for a whole run of text parts before a search
- isWorkingNote for text before an inline tool part › turns true for streaming text once a search arrives after it
- isWorkingNote for text that stays prose › is false for the answer after the last search
- isWorkingNote for text that stays prose › is false for text before a citation only
- isWorkingNote for text that stays prose › is false for a reply with no tools
- isWorkingNote for text that stays prose › is false for text before an inline tool that leaves it prose
- isWorkingNote for text that stays prose › is false for text before a tool the chat doesn't show
- isWorkingNote for text that stays prose › is false for the user's own text, whatever follows it
- isWorkingNote for text that stays prose › is false for an empty run

## `test/components/chat/working-note.test.tsx`

**jsdom rendered UI**

- TextRun in a saved reply › shows text before a search as a labelled note where it arrived
- TextRun in a saved reply › shows consecutive text parts before a search as one note
- TextRun in a saved reply › counts only the searches of the text's own message
- TextRun while the tutor replies › shows streaming text as prose until a search arrives after it

## `test/components/copy-with-time.test.tsx`

**jsdom rendered UI**

- CopyWithTime: a copy text with a time in it › puts the browser's time in the copy, where the slot is
- CopyWithTime: a copy text with a time in it › keeps the copy after the slot

## `test/components/local-time.test.tsx`

**jsdom rendered UI**

- LocalTime › renders on the server in UTC, unseen, keeping its room
- LocalTime › shows the browser's time once hydrated, with no mismatch
- LocalTime › shows the browser's time when rendered in the browser

## `test/components/markdown.test.tsx`

**jsdom rendered UI**

- Markdown › renders a GitHub table
- Markdown › renders an unfinished code fence as code while the text streams
- Markdown › closes unfinished emphasis while the text streams
- Markdown › opens manual links straight away and asks before other links

## `test/components/new-chat-form.test.tsx`

**jsdom rendered UI**

- NewChatForm › submits the chosen buddy id
- NewChatForm answers › shows the message the action returns for a form it can't use
- use_case_new_chat › offers every buddy with the default one preselected
- use_case_new_chat › offers every project and preselects the given one
- use_case_new_chat › says it is starting the chat while the action runs
- use_case_start_without_claude › says Claude is unavailable and keeps her project and buddy

## `test/components/new-project-form.test.tsx`

**jsdom rendered UI**

- use_case_new_project › sends the name and buddyId=hippy
- use_case_new_project_with_buddy › offers, in the interview-persona extra, the built-in buddies then her own, with Hippy chosen
- use_case_new_project_with_buddy › offers the built-in buddies while her own load
- use_case_new_project_with_buddy › sends the id of her own buddy when she chooses it
- use_case_new_project_without_name › shows the message the action returns for a missing name
- NewProjectForm answers › shows the message the action returns for a buddy not hers
- use_case_start_without_claude › a new project shows it is working, then says Claude is unavailable and keeps her name and buddy

## `test/components/new-standalone-chat-form.test.tsx`

**jsdom rendered UI**

- submits the chosen built-in or owned buddy without a project
- shows pending feedback and disables starting twice
- keeps the chosen buddy when the quota refuses a new chat

## `test/components/project-list.test.tsx`

**jsdom rendered UI**

- use_case_view_projects › links each project to its page
- use_case_view_projects › says so when there are no projects

## `test/components/site-footer.test.tsx`

**jsdom rendered UI**

- SiteFooter › credits the manual and its license in one sentence
- use_case_see_manual_credit › links to the manual and to its license

## `test/components/site-header-buddies-link.test.tsx`

**jsdom rendered UI**

- use_case_view_buddies › the header links to her buddies when she is signed in

## `test/components/site-header-first-html.test.tsx`

**jsdom rendered UI**

- use_case_use_on_phone › the signed-in header's first HTML has its links, in order
- use_case_use_on_phone › the header slot renders the signed-in links on %s
- use_case_use_on_phone › the header slot has no loading state

## `test/components/site-header.test.tsx`

**jsdom rendered UI**

- SiteHeader › offers the theme picker, after the links it is given
- SignedInLinks › names the two lists' links Chats and Projects
- SignedInLinks › shows no links to a visitor

## `test/components/theme-picker.test.tsx`

**jsdom rendered UI**

- ThemePicker › offers every theme and the three modes, by name
- ThemePicker › checks the choice applied to the page: $name

## `test/components/time-format.test.ts`

- formatTime › writes the day and minute in the zone it is given
- formatTime › writes the day alone, the zone's own day
- formatTime › writes in the zone of whoever runs it when given none
- formatTime › zero-pads a single-digit day and hour
- formatTime's width › the UTC and local strings are the same length

## `test/components/ui/button.test.tsx`

**jsdom rendered UI**

- Button › is a primary button that never submits a form unless told to
- Button › styles its child as the button, so a link stays a link

## `test/components/ui/confirm-dialog.test.tsx`

**jsdom rendered UI**

- ConfirmDialog › says what will happen, with the cancel button focused
- ConfirmDialog › confirms once, then closes
- ConfirmDialog › cancels with the cancel button, without confirming

## `test/components/ui/field.test.tsx`

**jsdom rendered UI**

- TextField › is labelled without a description or error by default
- TextField › is described by its hint
- TextField › shows its error as an alert, described by it and marked invalid
- TextField › gives each field its own ids
- TextAreaField › is a labelled multi-line field with its hint and error wired
- SelectField › is a labelled choice of its options

## `test/components/ui/form-message.test.tsx`

**jsdom rendered UI**

- Alert › is read out as soon as it appears, in line by default
- FormStatus › announces each change of what the form did

## `test/components/ui/icon.test.tsx`

**jsdom rendered UI**

- Icon › is decoration, so the words beside it alone name a control
- Icon › fills only the shapes an icon fills, in the text colour

## `test/components/ui/loading-skeleton.test.tsx`

**jsdom rendered UI**

- LoadingSkeleton › tells screen readers what is loading, and hides its shapes
- LoadingSkeleton › marks its region busy while it shows

## `test/components/ui/radio-card-group.test.tsx`

**jsdom rendered UI**

- RadioCardGroup › is a group named by its label, with one radio per option
- RadioCardGroup › starts with the default chosen, and sends it under its name
- RadioCardGroup › chooses the card she picks, and sends its value instead

## `test/db/client.test.ts`

- getDb › throws when DATABASE_URL is missing
- getDb › returns the same client on every call
- getDb › sends queries for a database on localhost to the local proxy at the URL's host and port
- getDb › still sends queries for a Neon database to Neon over HTTPS after a local one
- openPool › connects each pool with its own database's encryption, however many are open

## `test/email/login-link-email.test.ts`

- loginLinkEmail › holds the link in its text, with the expiry
- loginLinkEmail › is written by Hippy, and tells someone who didn't ask to ignore it
- loginLinkEmail › escapes the link in its HTML

## `test/email/outbox.test.ts`

- makes the outbox and puts the whole email under its key only once written
- keeps the published email whole while its replacement is being written
- keeps one whole email when two writes under one key overlap

## `test/email/send-email.test.ts`

- sendEmail through Resend › posts the message from the site's sender, with its idempotency key
- sendEmail through Resend › fails as our bug when Resend accepts without an id
- sendEmail through Resend › fails as retryable when Resend can't be reached
- sendEmail through Resend › names EMAIL_FROM_ADDRESS, and calls no one, when it isn't set
- sendEmail sorting Resend's refusals › %i %s is %s
- sendEmail sorting Resend's refusals › sorts an unreadable refusal by its status
- sendEmail sorting Resend's refusals › logs a refusal without the address, the link or the idempotency key
- sendEmail naming Resend's refusals › names the status and Resend's error in the failure

## `test/env.test.ts`

- %s › is returned trimmed when set
- %s › throws a descriptive error when missing or blank
- DATABASE_URL for drizzle-kit, which may be missing › is returned trimmed when set
- DATABASE_URL for drizzle-kit, which may be missing › is empty when missing or blank
- DATABASE_URL for the test commands, from .env.test › is returned trimmed when set
- DATABASE_URL for the test commands, from .env.test › throws, pointing to .env.test, when missing or blank
- ANTHROPIC_API_KEY › is returned trimmed when set
- ANTHROPIC_API_KEY › is undefined when missing or blank
- TUTOR_MODEL › selects Claude when missing or blank
- TUTOR_MODEL › selects the mock model off production with VERCEL_ENV=%s
- TUTOR_MODEL › refuses the mock with VERCEL_ENV=%s
- TUTOR_MODEL › selects Claude in production with TUTOR_MODEL=%s
- TUTOR_MODEL › throws a descriptive error for any other value
- EMAIL_TRANSPORT › selects Resend when missing or blank
- EMAIL_TRANSPORT › selects the outbox when set to outbox off production
- EMAIL_TRANSPORT › refuses the outbox in production
- EMAIL_TRANSPORT › selects Resend in production
- EMAIL_TRANSPORT › throws a descriptive error for any other value
- EMAIL_FROM_ADDRESS › returns the trimmed address with either transport
- EMAIL_FROM_ADDRESS › throws a descriptive error when missing or blank with Resend
- EMAIL_FROM_ADDRESS › defaults to hippy@example.test with the outbox
- the production origin › is the production domain Vercel names, over HTTPS
- the production origin › is undefined off Vercel
- isContinuousIntegration › is true only when CI is set to a non-empty value
- the end-to-end port › is the port set in E2E_PORT
- the end-to-end port › refuses a missing or blank E2E_PORT rather than choosing a port
- the end-to-end port › throws a descriptive error unless E2E_PORT is a port number

## `test/errors/anthropic-errors.test.ts`

- anthropicErrorCase › classifies %s: %s
- anthropicErrorCase › gives the unknown case to a model error it can't place
- anthropicErrorCase › leaves errors that didn't come from the model call alone

## `test/errors/app-error.test.ts`

- userMessage › gives every case its own static message
- userMessage › tells an invited user to try later, not to add credits, when the site's account is out of credits
- userMessage › tells the user to sign in again when she is signed out
- readAppErrorCase › reads every case from its name
- readAppErrorCase › reads anything else, such as a digest Next made, as unknown
- isUnrecognisedCaseName › is true for %s this build doesn't know
- isUnrecognisedCaseName › is false for every case this build knows, unknown included
- isUnrecognisedCaseName › is false for %s
- appErrorResponse › answers with the status and the case alone as plain text
- AppError › carries its case as its digest, and the case's message

## `test/errors/neon-errors.test.ts`

- databaseErrorCase › classifies %s: %s
- databaseErrorCase › recognizes a Neon error by its shape, not its class
- databaseErrorCase › leaves errors that didn't come from a query alone
- databaseErrorSource › finds the fetch error the driver keeps in sourceError
- violatesForeignKey › is true for a foreign key violation (23503) of the named constraint
- violatesForeignKey › is false for another constraint, another error code or another error

## `test/errors/newer-build-reload.test.ts`

- reloadForNewerBuild › reloads once and stamps the reload first
- reloadForNewerBuild › doesn't reload again within the window
- reloadForNewerBuild › reloads again once the window has passed
- reloadForNewerBuild › doesn't reload without storage to stamp

## `test/errors/to-app-error.test.ts`

- toAppError › carries the case, the original error and the static message
- toAppError › returns an AppError unchanged without logging it again
- toAppError logging › logs the failure once, with its case and operation
- toAppError logging › logs the same failure once, however often it is turned into an AppError
- toAppError cases › gives %s to %s
- withAppErrors › returns the call's result
- withAppErrors › rethrows a failure as an AppError and logs it
- withAppErrors › passes Next's prerender abort through without logging it

## `test/flags/flag-choice.test.ts`

- FLAGS_PRE_PAINT_SCRIPT › hides the flags the saved cookie names
- FLAGS_PRE_PAINT_SCRIPT › without a saved cookie, the page keeps the default
- FLAGS_PRE_PAINT_SCRIPT › a saved cookie that names nothing keeps every default, so the buddy mechanics stay hidden
- FLAGS_PRE_PAINT_SCRIPT › a saved cookie that names the buddy mechanics shows them, and hides only the interview buddy
- FLAGS_PRE_PAINT_SCRIPT › a saved cookie that names an extra shown by default hides it, beside the buddy mechanics
- FLAGS_PRE_PAINT_SCRIPT › a saved cookie that hides nothing shows every extra
- FLAGS_PRE_PAINT_SCRIPT › leaves out unknown flags and repeats, in the registry's order
- hiddenFlagsCookie › keeps the ids of the flags switched from their default for a year, on every page, readable by the pre-paint script
- applyHiddenFlags › hides exactly the flags given, at once
- hiddenFlagsIn and readAppliedHide › read the flags the page hides
- subscribeToFlags › tells the subscriber when the hidden flags change, until it stops

## `test/flags/save-hidden-flags-action.test.ts`

- saveHiddenFlagsAction › saves the known flags to her account, as those switched from their default, and to this browser's cookie
- saveHiddenFlagsAction › leaves the cookie alone when her account can't be saved
- saveHiddenFlagsAction › refuses anything but a list of ids, saving nothing
- saveHiddenFlagsAction › saves nothing for a signed-out request
- saveHiddenFlagsAction with an extra off by default › saving one hidden extra stores it beside the extras off by default she shows

## `test/flags/seed-hidden-flags.test.ts`

- seedHiddenFlags › copies the known flags her account switched into this browser's cookie
- seedHiddenFlags › replaces another choice with the defaults, buddy mechanics and interview buddy hidden, when her account switched none
- seedHiddenFlags › shows the buddy mechanics when her account switched them on
- seedHiddenFlags › reads nothing from the database, since sign-in has just read her extras

## `test/flags/switch-flag.test.ts`

- switchFlag › hides an extra at once and saves the whole choice, in the registry's order
- switchFlag › shows a hidden extra again, and saves that too
- switchFlag › still applies when the choice can't be saved

## `test/id-fixtures.test.ts`

- %s › makes a new random id each call
- %s › throws, naming the fixture and the value, unless it is a UUID

## `test/ids.test.ts`

- %s › returns a canonical lowercase UUID unchanged
- %s › accepts uppercase and mixed case, returning the id in lowercase
- %s › accepts any version and variant, as Postgres does
- %s › returns undefined for %s
- parseMessageId › returns any non-empty id unchanged, as the AI SDK's ids are no UUIDs
- parseMessageId › returns undefined for an empty string
- parseMessageId › accepts an id of MESSAGE_ID_MAX_LENGTH characters, and no longer
- a MessageId is a string that no other id can stand in for
- a UserId is a string that no project or chat id can stand in for
- a ProjectId and a ChatId are strings that cannot stand in for each other

## `test/manual/manual-clone.test.ts`

- cloneManual › clones the release branch, not the development branch
- cloneManual › lists and reads only the manual's pages

## `test/manual/manual-sections.test.ts`

- manualSectionsFromRst › adds the file path and URL to each section
- readManualSections › splits every page in path order
- readManualSections › keeps path order across many files

## `test/manual/manual-source.test.ts`

- isManualPage › accepts the RST files under manual/, at any depth
- isManualPage › rejects other files under manual/ and RST files outside it
- manualUrl › builds the latest manual URL for a page
- isManualUrl › accepts the URLs manualUrl builds
- isManualUrl › rejects lookalike hosts, plain http and other paths on the host
- isManualUrl › rejects malformed links
- isManualUrl › works in browsers without URL.parse

## `test/manual/reindex-manual.test.ts`

- reindexManual › tells the operator what it clones and how many sections it indexed
- reindexManual › inserts at most 1000 sections per statement

## `test/manual/search-manual.test.ts`

- searchManual failures › rejects with a logged AppError when the query fails
- searchManual labels › returns each section's title, label, URL, anchor, file path and text
- searchManual labels › labels a page's top section with its heading alone

## `test/manual/sphinx-id.test.ts`

- makeSphinxId › lowercases words and joins them with hyphens
- makeSphinxId › turns label punctuation into hyphens
- makeSphinxId › strips leading digits and hyphens and trailing hyphens
- makeSphinxId › transliterates accented letters and digraphs like docutils
- makeSphinxId › returns an empty id when nothing usable is left
- plain text of inline RST markup › keeps the text of roles, literals and interpreted text
- plain text of inline RST markup › keeps the explicit title of references
- plain text of inline RST markup › removes emphasis markers and backslash escapes

## `test/manual/split-rst.test.ts`

- splitRstSections › starts a section at every heading, with or without an overline
- splitRstSections › derives the anchor from the heading's plain text
- splitRstSections anchors for repeated headings › anchors a repeated heading at its label when it has one
- splitRstSections anchors for repeated headings › anchors a repeated heading without a label at its parent heading
- splitRstSections heading recognition › drops the text of icon roles from headings
- splitRstSections heading recognition › ignores underline-like lines in tables, transitions and indented blocks
- splitRstSections heading recognition › returns no sections for a file without headings

## `test/memory/memory-edit.test.ts`

- applyMemoryEdit › replaces the one occurrence of oldText with newText
- applyMemoryEdit › inserts newText literally, with no replacement patterns
- applyMemoryEdit › deletes oldText when newText is empty
- applyMemoryEdit › adds newText as a new paragraph when oldText is empty
- applyMemoryEdit › makes newText the whole text of an empty memory
- applyMemoryEdit › fails when oldText is missing or occurs more than once
- applyMemoryEdit › fails when the edit would change nothing

## `test/memory/memory-store-edits.test.ts`

- memory store edits › editMemory tries again on each newer version, then gives up with a logged AppError

## `test/memory/memory-store.test.ts`

- memory store reads › readMemoryHistory skips malformed version or author rows
- memory store failures › %s rejects with a logged AppError when the database is unreachable

## `test/memory/memory.test.ts`

- isMemoryEmpty › is true for a project with nothing saved
- isMemoryEmpty › is true for a saved empty text
- isMemoryEmpty › is true for a text of only whitespace
- isMemoryEmpty › is false for a text with something in it

## `test/projects/store.test.ts`

- project store failures › %s rejects with a logged AppError when Postgres rejects the query
- project store reads › getProject finds a malformed id nowhere
- project store reads › getProject reads the project's interview chat
- project store reads › listProjects skips a row whose id is not a UUID
- project store createProject › createProject saves the project as the owner's and returns it
- project store createProject › createProject rejects with a logged AppError when no project comes back

## `test/proxy.test.ts`

- proxy matcher › runs on %s
- proxy matcher › skips the static asset %s
- proxy public paths › lets anyone reach %s and its Server Actions
- proxy public paths › admits no other path below a public one
- proxy sessions › redirects a page request without a session to /login
- proxy sessions › rejects an API request without a session with 401 and the signed-out case
- proxy sessions › rejects an API request whose session has expired as signed out
- proxy sessions › redirects a request whose session is signed with another secret
- proxy sessions › lets a request with a valid session through
- proxy font preloads › sends the default theme's preloads with a signed-in page
- proxy font preloads › sends none with an API request or a redirect
- use_case_choose_theme › the sign-in page preloads the fonts for $name
- use_case_choose_theme › the sign-in page preloads each font as a cross-origin WOFF2 font

## `test/quota/anthropic-usage.test.ts`

- readAnthropicUsage › reads the tokens and the split of cache writes Anthropic sends
- readAnthropicUsage › has no split when Anthropic sends no cache_creation
- readAnthropicUsage › is undefined for metadata without Anthropic's usage, or with a malformed one

## `test/quota/prices.test.ts`

- callCost for Sonnet 5.5 › charges $kind tokens
- callCost for Haiku 5.5 › charges $kind tokens
- callCost › adds up every kind of token in one call
- callCost › rounds a fraction of a micro-USD up
- callCost › charges nothing for no tokens

## `test/quota/quota.test.ts`

- checkQuota › is within the quota with no spend this month
- checkQuota › is within the quota a micro-USD below it
- checkQuota › is used up at the quota, until midnight UTC on the 1st of next month
- checkQuota › is used up past the quota, as after a reply that crossed it
- checkQuota › rejects when the spend can't be read

## `test/quota/spend-meter-stopped.test.ts`

- spendMeter on a stream that stops without finish › charges an estimate once it ends: the input counted at its start, and four characters an output token
- spendMeter on a stream that stops without finish › charges the estimate when the model's stream fails, then fails
- spendMeter on a stream that stops without finish › cancels the model's stream and charges the estimate when the reader cancels

## `test/quota/spend-meter.test.ts`

- spendMeter on a stream that finishes › charges the owner the finished usage once, with the split Anthropic sent, and passes every part on
- spendMeter on a stream that finishes › prices every cache write as a 5-minute one when Anthropic sends no split
- spendMeter on a stream that finishes, storing its cost › stores the cost before passing finish on
- spendMeter on a stream that finishes, storing its cost › passes every part on when the cost can't be stored
- spendMeter on a generated call › charges the owner the call's usage at its model's prices once it returns

## `test/quota/spend-store.test.ts`

- recordSpend while the database is unreachable › tries the same upsert again, unlogged, when the database comes back
- recordSpend while the database is unreachable › rejects with one logged AppError after 3 tries when it stays unreachable
- recordSpend while the database is unreachable › doesn't try again when Postgres rejects the query
- recordSpend for an owner who no longer exists › still rejects with a logged AppError for %s
- readMonthlyUsage › reads owner's row for the month, with the quota and its reset
- readMonthlyUsage › is no spend in a month with no row
- spend store failures › %s rejects with a logged AppError when Postgres rejects the query

## `test/scripts/test-db/playwright-config.test.ts`

- Playwright waits for its own bound Next process, never URL health
- $name preserves its device and rasterization policy

## `test/scripts/test-db/test-database.test.ts`

- database operations stay inside the validated boundary › all mutators refuse unsafe routing before a pool exists
- database operations stay inside the validated boundary › all mutators refuse a raw URL with a different driver authority
- database operations stay inside the validated boundary › uses the validated URL name, never an inconsistent caller name
- database operations stay inside the validated boundary › bounds connections and statements before any maintenance query
- reset and query failures › a failed drop closes its pool without creating or migrating
- reset and query failures › reset recreates only the supplied database and then migrates it
- reset and query failures › a migration failure closes its pool with bounds in place

## `test/themes/choose-theme.test.ts`

- chooseTheme and chooseMode › restyle the page at once and save the whole choice
- chooseTheme and chooseMode › an unknown value applies and saves the default
- chooseTheme and chooseMode › still restyle the page when the choice can't be saved

## `test/themes/preload-theme-fonts.test.ts`

- preloadThemeFonts › preloads exactly $name's font files when another theme is applied
- preloadThemeFonts › preloads nothing when $name is the applied theme

## `test/themes/save-theme-choice-action.test.ts`

- saveThemeChoiceAction › saves the choice to this browser's cookie for a year
- saveThemeChoiceAction › saves the default for a bad part of $raw
- saveThemeChoiceAction › saves the choice with nobody signed in
- saveThemeChoiceAction › touches no database, since the theme belongs to the browser

## `test/themes/theme-choice.test.ts`

- THEME_PRE_PAINT_SCRIPT › applies a choice saved in themeChoiceCookie's form
- themeChoiceSetCookie › keeps the choice for a year on every path, readable by the pre-paint script
- themeChoiceSetCookie › leaves themeChoiceCookie as just a name and value, for Playwright
- parseThemeChoiceCookie › reads %s as the pre-paint script does

## `test/themes/themes.test.ts`

- parseThemeChoice › keeps a known theme and mode
- parseThemeChoice › an unknown theme is the default theme, keeping the mode
- parseThemeChoice › an unknown mode is the default mode, keeping the theme
- parseThemeChoice › missing or malformed parts are the default
- THEMES › Gravy Falls is the default, under System
- THEMES › ids are unique kebab-case and every theme has a name

## `test/tutor/answer-now.test.ts`

- withAnswerNowNote › adds the note after the conversation, from the app
- withAnswerNowNote › adds the note it is given, such as a buddy's own
- withAnswerNowNote › calls the person the user
- endsWithoutText › holds for searches, then citing, then an empty call
- endsWithoutText › counts text written in the call that cites as the answer
- endsWithoutText › counts text written after citing as the answer
- endsWithoutText › doesn't count text written before a search as the answer
- calledCiteManual › holds when any call cited the manual
- calledCiteManual › doesn't hold for searches and an answer alone
- isAnswerNowNote › knows the note as the model receives it
- isAnswerNowNote › knows no other message as the note

## `test/tutor/central-chat-prompt.test.ts`

- buildTutorInstructions in the central chat › opens the chat's own part with the central chat part, with no project, memory or interview
- Central prompt cache › shares the cached text of a project chat with the same buddy
- Central prompt cache › reads no project memory
- the central chat part's default › tells the tutor to call create_project when the user asks for a project
- renderTutorInstructions in the central chat › puts the user's name for {{name}} in the central chat part

## `test/tutor/chat-kickoff.test.ts`

- userFirst › puts the neutral turn before the tutor's opening, after the system messages
- userFirst › leaves a conversation that starts with the user alone
- userFirst › uses the neutral kickoff it is given, such as a buddy's own
- userFirst › gives a prompt with no conversation the neutral turn
- the kickoffs › each knows its own text and nothing else

## `test/tutor/chat-naming-call.test.ts`

- chat naming's call to Haiku › sends the whole chat from the opening question and saves the answer for the owner
- chat naming's call to Haiku › has a time limit, so a slow answer can't hang

## `test/tutor/chat-naming.test.ts`

- chat naming schedule › names the chat after her message %i
- chat naming schedule › leaves the name and asks Haiku nothing after her message %i
- chat naming schedule › never renames a chat %s, nor asks Haiku
- chat naming in a chat that opens with the tutor's opening › counts only her messages, not the tutor's opening, naming the chat after her message %i
- chat naming in a chat that opens with the tutor's opening › counts only her messages, not the tutor's opening, leaving the name after her message %i
- chat naming asks Haiku › with the conversation's text up to the reply, then the request
- chat naming asks Haiku › and saves its answer trimmed
- chat naming failures › keeps the old name for %s, logging it once without the answer
- chat naming failures › keeps the old name when Haiku fails, logging it once
- chat naming failures › never rejects when the store fails, logging it once

## `test/tutor/chat-opening.test.ts`

- writeChatOpening asking Claude › is the tutor's first message, as a message from the tutor
- writeChatOpening asking Claude › asks the model once, with the chat's prompt and the kickoff alone
- writeChatOpening asking Claude › leaves the interview out of the prompt of a chat that is not the interview chat
- writeChatOpening with the owner's name › puts her name for every {{name}} in the prompt, leaving the buddy as written
- planning switches in the opening model request › omits only disabled instructions for $hiddenFlags
- writeChatOpening without Claude › is undefined when Claude fails, logged once
- writeChatOpening without Claude › is undefined when Claude fails mid-stream, logged once
- writeChatOpening without Claude's text › is undefined when the model can't be made, logged once
- writeChatOpening without Claude's text › is undefined when Claude writes nothing, logged once
- writeChatOpening timing out › waits 30 s for Claude, then is undefined, logged once

## `test/tutor/chat-protocol.test.ts`

- readChatRequest accepts › a chat id and the new user message, with the id lowercased
- readChatRequest accepts › the message without fields the chat does not keep
- readChatRequest rejects › %s
- chat failures › arrive as their case
- chat failures › read any other text as the unknown case
- chat failures › read a case name this build doesn't know as unknown, from a newer build
- chat failures › don't take %s to be from a newer build
- quota-used-up refusals › are 429 with the case name and the server's reset instant on its own line
- quota-used-up refusals › arrive as their case and the server's reset
- quota-used-up refusals › arrive with no reset when they have %s
- quota-used-up refusals › read %s as the unknown case

## `test/tutor/citation-prompt.test.ts`

- CITATION_RULES › names the search and citation tools by their registered names
- CITATION_RULES › calls the person the user

## `test/tutor/conversation-to-answer.test.ts`

- conversationToAnswer for a new message › saves the message in the owner's chat and answers the history with it last
- conversationToAnswer for a new message › refuses with 400 and the unknown case a message whose id another chat's message has
- conversationToAnswer for a new message › refuses with 409 and the already-answered case a message another request saved after the history was read
- conversationToAnswer's reply › carries the grant of the owner's one quota check, for every model call it makes
- conversationToAnswer for a resent message › answers the history again, saving nothing, when the message is last and this request claims its reply
- conversationToAnswer for a resent message › refuses with 409 and the already-answered case, saving nothing, when the message is last but another request still replies to it
- conversationToAnswer for a resent message › refuses with 409 and the already-answered case, saving nothing, when anything follows it
- conversationToAnswer once the owner's quota is used up › refuses a new message with 429 and the quota-used-up case, naming the quota's reset, saving nothing
- conversationToAnswer once the owner's quota is used up › refuses to answer a resent unanswered message again
- conversationToAnswer once the owner's quota is used up › still says an answered message is answered
- conversationToAnswer refusals › gives each %s request its own readable response

## `test/tutor/interview-prompt.test.ts`

- INTERVIEW_PROMPT › asks for the goal, skill level and purpose, then milestones, saved to the memory
- INTERVIEW_PROMPT › calls the person the user, never by name
- INTERVIEW_PROMPT in the tutor's prompt › is in the interview chat's own part, not the cached part, with %s memory
- INTERVIEW_PROMPT in the tutor's prompt › is in no part of another chat's prompt, with %s memory
- INTERVIEW_PROMPT in the tutor's prompt › leaves no gap in the prompt, when isInterviewChat is %s

## `test/tutor/memory-prompt.test.ts`

- memoryPromptSection › gives the chat its project's memory, set apart in tags
- memoryPromptSection › says when the memory is empty
- memoryPromptSection › is part of every chat's own prompt, before the buddy
- memoryInPrompt › reads the memory back from a prompt that holds its section
- memoryInPrompt › is empty when the memory is, or the prompt has no memory

## `test/tutor/mock-chat-name.test.ts`

- mockChatNameScript › names the chat after its first message and how many messages it has
- mockChatNameScript › in a chat that opens with the tutor's opening, names it after her first message, without counting the neutral kickoff
- mockChatNameScript › quotes no more than the first 30 characters of the first message

## `test/tutor/mock-empty-after-search.test.ts`

- /mock-empty-after-search before the answer-now call › searches the manual for the text first
- /mock-empty-after-search before the answer-now call › cites every section found, then ends with an empty step
- /mock-empty-after-search before the answer-now call › ends with an empty step after a search that finds nothing
- /mock-empty-after-search in the answer-now call › answers the answer-now call from the sections its search found
- /mock-empty-after-search in the answer-now call › names the text and each section in the answer
- /mock-empty-after-search in the answer-now call › says the search found nothing when the answer-now call has no sections
- /mock-empty-after-search in the default script › says how to use the command, without searching, when there's no text
- /mock-empty-after-search in the default script › answers /mock-empty-after-search in the default script

## `test/tutor/mock-error.test.ts`

- mockErrorReply › fails the step with the Anthropic error event asked for
- mockErrorReply › answers %s with text, not a failure
- mockErrorReply › fails the mock tutor's reply with the matching case

## `test/tutor/mock-model.test.ts`

- mockTutorModel default script › replies the same way to the same message
- mockTutorModel default script › calls the tool a /mock-tool message names, then replies
- mockTutorModel scripts › ends the reply at the first step without a tool call
- mockTutorModel scripts › continues after each tool call until the script ends
- mockTutorModel scripts › fails mid-stream, after its text, at a step with an error
- mockTutorModel delays › streams nothing of a step until its delay has passed
- mockTutorModel generating all at once › plays the same steps as streaming does
- mockTutorModel generating all at once › fails with a step's error
- mockTutorModel conversation › hands the script the system prompt, the earlier messages' texts and this reply's tool results
- mockTutorModel answer-now call › hands the script the user's message, this reply's tool results and answerNow

## `test/tutor/mock-opening.test.ts`

- the mock's chat opening › sums up the project's memory, then asks a question
- the mock's chat opening › only asks the interview's first question while the memory is empty
- the mock's chat opening › starts a lesson, not the interview, in another chat with an empty memory
- the mock's chat opening › fails as Claude does when the project's name holds /mock-error <type>

## `test/tutor/mock-script.test.ts`

- defaultMockScript /mock-tool › calls the named tool with the JSON object, then says so
- defaultMockScript /mock-tool › answers input that is not a JSON object with text alone
- defaultMockScript /mock-search › searches the manual for the query first
- defaultMockScript /mock-search › then cites every section found, then replies with each one
- defaultMockScript /mock-search › says the manual has nothing, citing nothing, when nothing is found
- defaultMockScript /mock-search › says the search failed when it did
- defaultMockScript /mock-recall › quotes each line of the prompt and earlier messages with the word
- defaultMockScript /mock-recall › says when nothing mentions the word
- defaultMockScript other messages › /mock-markdown shows every kind of Markdown a reply uses
- defaultMockScript other messages › lists how to use each command it knows for an unknown one
- defaultMockScript other messages › quotes any other message in a Markdown reply

## `test/tutor/mock-slow.test.ts`

- mockSlowReply › is one text step, quoting the message, that starts after the delay
- mockSlowReply › answers /mock-slow in the default script

## `test/tutor/mock-system-prompt.test.ts`

- mockSystemPromptReply › replies with every system message, fenced so it shows as written
- mockSystemPromptReply › answers the command in the mock tutor model

## `test/tutor/mock-working-note.test.ts`

- /mock-working-note › writes a note and searches the manual for the text, then answers
- /mock-working-note › names the text in both the note and the answer
- /mock-working-note › says how to use the command, without searching, when there's no text
- /mock-working-note › answers /mock-working-note in the default script

## `test/tutor/model.test.ts`

- tutorModel with Claude › uses a Claude model through the Anthropic provider
- tutorModel with Claude › sends the API key that src/env.ts reads
- tutorModel with Claude › fails as an invalid API key when the key is missing
- tutorModel with TUTOR_MODEL=mock › uses the mock model, with no API key
- chatNameModel › uses Claude Haiku through the Anthropic provider
- chatNameModel › uses the mock with TUTOR_MODEL=mock
- every model › is made only from a quota grant, never from a bare user id
- every model call › starts with the user: a chat that opens with the tutor gets the neutral kickoff first

## `test/tutor/planning-defaults.test.ts`

- $name planning defaults › supplies both skills in a %s without changing the interview boundary

## `test/tutor/planning-guidance.test.ts`

- the supplied default retains $label guidance

## `test/tutor/planning-replies.test.ts`

- %s replies stop on a failed preference read rather than enabling defaults
- live choices in a %s chat › $hidden changes only skill instructions and re-enabling restores them

## `test/tutor/planning-skills.test.ts`

- planning skills in a %s chat › includes only enabled skill parts for $hidden
- planning skills in a %s chat › switches $hidden change only their own supplied instructions
- planning skills in a %s chat › display-only extras never change supplied instructions
- use_case_buddy_brainstorming › defaults on independently of prompt mechanics
- use_case_project_breakdown › defaults on independently of prompt mechanics
- skill templates substitute only literal names for $name
- deliberately empty skills add no instructions or separators

## `test/tutor/provider-bookkeeping.test.ts`

- withoutProviderBookkeeping › drops Anthropic's call-start parts and keeps every other part in order
- withoutProviderBookkeeping › leaves the message it was given unchanged

## `test/tutor/reply-answer-now.test.ts`

- replyToChat answer-now call to the model › gets every tool call and whole result of the reply, then the note
- replyToChat answer-now request to Claude › holds every search result whole and the thinking, then the note
- replyToChat request to Claude after cite_manual › holds the citations and the reminder to write the answer, while the chat's part keeps the citations alone
- replyToChat with /mock-empty-after-search › answers from the search results in the answer-now call, under its citations

## `test/tutor/reply-answers.test.ts`

- replyToChat after the observed empty final call › asks once more and saves the answer, after the citations
- replyToChat after the observed empty final call › sends the answer-now call the same prompt and tools, plus the note
- replyToChat saving an answer-now reply › keeps the thinking blocks' signatures in the saved reply
- replyToChat saving an answer-now reply › never shows or saves the hidden note
- replyToChat saving an answer-now reply › logs every call of both, with the answer-now call marked
- replyToChat after a short remark and an empty final call › asks once more and saves the remark, then the answer
- replyToChat after an answer written as it cites, and an empty final call › makes no answer-now call and saves the answer once
- replyToChat when the answer-now call fails › sends the error's case and saves no reply

## `test/tutor/reply-central.test.ts`

- the model call of a reply in the central chat › sends the manual's tools and create_project
- the model call of a reply in the central chat › gives create_project the owner, the chat and its buddy, and no project
- the model call of a reply in the central chat › opens the chat's prompt with the central chat part

## `test/tutor/reply-failures.test.ts`

- replyToChat model failures › keeps the user's message but saves no reply and names nothing
- replyToChat model failures › sends the case, not the upstream message
- replyToChat model failures › logs the failure once with its case and the original error
- replyToChat model failures › sends and logs the case of an error in the middle of the reply
- replyToChat model failures › saves no reply and names nothing when the reply fails mid-stream
- replyToChat other failures › answers 500 with the case when a store call fails
- replyToChat other failures › answers 500 with the unknown case and logs any other failure
- replyToChat other failures › logs a failed save of the reply once

## `test/tutor/reply-project-tools.test.ts`

- the model call of a reply in a project chat › gives update_memory the owner, the loaded chat and its project
- the model call of a reply in a project chat › offers no create_project

## `test/tutor/reply-quota.test.ts`

- replyToChat once the owner's quota is used up › refuses with 429 without making a model
- replyToChat within the owner's quota › replies with a model made from the grant of the owner's quota check
- replyToChat within the owner's quota › names the chat with the reply's grant, checking the quota only once

## `test/tutor/reply-resend.test.ts`

- replyToChat resending a saved message › gives the model the message once when it is the last saved one, saving it no second time
- replyToChat resending a saved message › names the chat from the conversation with the resent message once
- replyToChat resending a message while its reply streams › releases the claim when the reply fails, so a resend is answered
- replyToChat releasing its claim on the message › releases the claim when the reply fails before it streams
- replyToChat releasing its claim on the message › releases the claim when the reply isn't saved
- replyToChat releasing its claim on the message › keeps the claim of a saved reply, which answers the message
- replyToChat releasing its claim on the message › logs a failed release once and still answers the failure

## `test/tutor/reply-step-limit.test.ts`

- a reply's diagnostics line at the step limit › marks a reply that ran out of model calls with searches only
- a reply's diagnostics line at the step limit › doesn't mark a cited reply that ends by itself
- a reply's diagnostics line at the step limit › doesn't mark a reply whose last allowed call answers
- a reply's diagnostics line when a call cited the manual › shows that a call cited the manual, though the limit stopped the reply

## `test/tutor/reply.test.ts`

- replyToChat replies › answers 404 with the not-found case for an unknown chat
- replyToChat replies › streams the tutor's reply
- replyToChat prompt › sends the system prompt, then the full history
- replyToChat prompt › asks Anthropic to cache the shared prompt and the conversation
- replyToChat saving › saves the new user message and the tutor's reply to it
- replyToChat saving › saves the whole reply when the browser disconnects
- replyToChat saving › saves the reply under the id the browser received
- replyToChat naming the chat › names the chat once the reply is saved, for the message it answers
- replyToChat naming the chat › ends the response once the reply is saved, while naming still runs
- replyToChat tools › runs the tools the model calls and saves their parts
- replyToChat saved parts › drops the provider's call-start parts and keeps other custom parts

## `test/tutor/system-prompt-name.test.ts`

- buildTutorInstructions with her name › puts her name for every {{name}} in the role, voice and teaching rules
- buildTutorInstructions with her name › keeps a $ in her name as she typed it
- buildTutorInstructions with her name › leaves other braces as written
- buildTutorInstructions with her name › leaves the buddy it was given as written
- buildTutorInstructions without her name › says the user for every {{name}}
- the shared text with her name › is the same in two of her chats in one buddy
- the shared text with her name › never reaches another owner's prompt

## `test/tutor/system-prompt.test.ts`

- buildTutorInstructions › puts the text every chat shares first, as a cache breakpoint
- buildTutorInstructions › follows with the chat's project and buddy, uncached
- buildTutorInstructions › calls the person it teaches the user
- buildTutorInstructions › reads the project's memory once, so every section sees one version
- renderTutorInstructions › renders every static text from the buddy's parts

## `test/tutor/tools/cite-manual-saved-chat.test.ts`

- citeManualTool in a saved chat › still replies when a saved output is malformed, reading no citations

## `test/tutor/tools/cite-manual.test.ts`

- citeManualTool › cites the sections a search returned, with their labels, in the order named
- citeManualTool › drops sections no search returned
- citeManualTool › cites nothing without a search
- citeManualTool across turns › cites a section a search returned earlier in the chat
- citeManualTool as the model reads it › adds that the links go under the reply and the answer is still to write
- citeManualTool as the model reads it › keeps the tool's own output, which the chat shows, as the citations alone
- CITE_MANUAL_OUTPUT › accepts only links into the Blender manual

## `test/tutor/tools/create-project.test.ts`

- create_project › starts the project, trimmed, for the owner in the chat's buddy
- create_project › reports the quota used up, with its reset as an ISO time
- create_project › rejects a name of only spaces without starting a project

## `test/tutor/tools/index.test.ts`

- tutorTools › is a tool set the AI SDK accepts
- tutorTools › describes each tool as the buddy's parts say
- the tools in each place › offers the manual's tools and the memory's in a project chat
- the tools in each place › offers the manual's tools and create_project in the central chat
- the tools in each place › marks only the last tool the provider gets as a cache breakpoint, in a %s chat

## `test/tutor/tools/input-fields.test.ts`

- the tools' input fields › name each tool's fields with the descriptions they send

## `test/tutor/tools/search-manual.test.ts`

- searchManualTool › maps section labels, URLs and excerpts and requests a five-section limit
- searchManualTool › cuts a long section's text at a word, marked with an ellipsis
- searchManualTool › returns no sections when nothing matches
- searchManualTool › fails the tool call, not the reply, when the search fails

## `test/tutor/tools/update-memory.test.ts`

- update_memory › reports an edit that did not apply, with the memory as it is
- update_memory › fails as not found when the chat's project is not the owner's

## `test/ui/copy/chat.test.ts`

- quotaUsedUpMessage › says the quota is used up and names the reset day in UTC

## `use-cases/test-declarations.test.ts`

- an e2e test › is named by a slug title, its own or a group's around it
- an e2e test › is not named by a plain title, or a plain group's
- an e2e test outside e2e/visual/ › names only an auth case, by its title or its group's
- an e2e test outside e2e/visual/ › is reported when it names any other case
- a Vitest test › is named by a slug title, its own or a group's, in Vitest's names
- a Vitest test › is not named by other calls or a plain title
- a Vitest test › names only cases by its slug titles

## `vitest.browser-deps.test.mts`

- a bare import missing from the list fails, naming the package
- a bare import the resolved list holds passes
- dependency discovery is off

## `vitest.browser-syntax.test.mts`

- a served module that does not parse › is reported with its position and the lines around it
- a served module that does not parse › is still served as transformed
- a served module that parses is not reported
- every browser project serves through the check

## `vitest.server.config.test.ts`

- server test timeouts › a server test may run longer than Vitest's default
- server test timeouts › a server test's hooks may run longer than Vitest's default

## `test/flags/flags.test.ts`

Only the direct-call checks below were removed; actual-filesystem checks remain.

- FLAGS › lists each extra once, by a kebab-case id
- FLAGS › names copy that exists for every flag, and every entry of the copy is a flag's
- FLAGS › hides only the buddy mechanics and interview buddy until the user switches them on
- hiddenFromSwitched and switchedFromHidden › with nothing switched, hide only the flags off by default
- hiddenFromSwitched and switchedFromHidden › switching a flag flips it from its default
- hiddenFromSwitched and switchedFromHidden › are each other's inverse
- hiddenFromSwitched and switchedFromHidden › leave out unknown ids and repeats, in the registry's order
- extraTag › returns the attribute that the hiding rules select on

## `test/quota/quota-terms.test.ts`

Only the direct-call checks below were removed; actual-filesystem checks remain.

- spendMonthOf › is the first day of the moment's month in UTC
- spendMonthOf › keeps the last second of a month in that month
- spendMonthOf › goes by UTC, not the offset the moment was written in
- spendMonthOf › turns December into January of the next year
- quotaResetsOn › is midnight UTC on the first of the next month
- quotaResetsOn › on the last second of a month, is the next moment
- quotaResetsOn › at the first moment of a month, is a month away
- quotaResetsOn › after December, is January 1st of the next year
- formatResetDay › names the day as a reader says it, such as November 1, 2026
- formatResetDay › names UTC's day, wherever the reader is

## `test/quota/quota-grant.test.ts`

Only the direct-call checks below were removed; actual-filesystem checks remain.

- grantQuota › grants owner's model calls

## `test/errors/error-log.test.ts`

Only the direct-call checks below were removed; actual-filesystem checks remain.

- logAppError › logs the case with the status, upstream message and request id
- logAppError › logs the Postgres code and the query, but not the query parameters
- logAppError › logs nothing of the request body sent to the model
- logEmailFailure › logs the problem and the operation, then the failure's details
- logReplySteps › logs each model call's finish reasons, input tokens and part types, and the reply's totals
- logModelCallSpend › logs the call as one line of JSON under its prefix

## `test/themes/streamdown-names.test.ts`

Only the direct-call checks below were removed; actual-filesystem checks remain.

- Streamdown's names › are found as classes, with variants and opacity
