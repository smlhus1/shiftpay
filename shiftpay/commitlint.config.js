/**
 * Commit message linter — enforces Conventional Commits.
 * Used by the `.husky/commit-msg` hook.
 */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Keep the header short but allow a bit of slack for scoped commits.
    "header-max-length": [2, "always", 100],
    // Body lines can be long when pasting stack traces or SQL.
    "body-max-line-length": [0, "always"],
    "footer-max-line-length": [0, "always"],
  },
};
