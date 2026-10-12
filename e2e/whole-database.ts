// The tag for tests that need the test database to themselves, such as a full
// reindex, which deletes every manual section. (A check of the site with no
// projects needs no tag: each test's account starts with none.)
// playwright.config.ts runs tests with this tag in their own project, one at
// a time, after every other test has finished.
export const WHOLE_DATABASE_TAG = "@whole-database";
