// Where the reindex script gets the Blender Reference Manual. When a new
// stable Blender release ships, set MANUAL_BRANCH to its release branch and
// run `npm run manual:reindex`.
export const MANUAL_REPOSITORY_URL =
  "https://projects.blender.org/blender/blender-manual.git";
export const MANUAL_BRANCH = "blender-v5.3-release";

// Matches html_baseurl in the branch's manual/conf.py. `latest` serves the
// latest stable release, which is the branch indexed.
export const MANUAL_BASE_URL = "https://docs.blender.org/manual/en/latest/";
