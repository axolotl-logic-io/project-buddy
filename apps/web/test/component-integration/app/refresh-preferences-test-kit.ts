// Page layout tests do not make preference RPCs; the synchronizer has its
// own integration tests.
function RefreshPreferences(): null {
  return null;
}

export { RefreshPreferences };
