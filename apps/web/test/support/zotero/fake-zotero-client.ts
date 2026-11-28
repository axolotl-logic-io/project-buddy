// The OAuth client the fake Zotero (fake-zotero.ts) knows: the tests'
// ZOTERO_CLIENT_KEY and ZOTERO_CLIENT_SECRET. These are made-up values for
// the fake, not Project Buddy's registration at Zotero.
const FAKE_CLIENT: { readonly key: string; readonly secret: string } = {
  key: "fake-zotero-client",
  secret: "fake-zotero-secret",
};

// The client as the environment variables the site reads it from.
function fakeZoteroClientEnvironment(): Record<string, string> {
  return Object.fromEntries([
    ["ZOTERO_CLIENT_KEY", FAKE_CLIENT.key],
    ["ZOTERO_CLIENT_SECRET", FAKE_CLIENT.secret],
  ]);
}

export { FAKE_CLIENT, fakeZoteroClientEnvironment };
