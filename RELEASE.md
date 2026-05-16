# Release Guide

This project currently ships one package: the VS Code extension `jackboylan.yakanban`.

The release artifact is a `.vsix` file produced by `vsce package`, and the public distribution channel is the VS Code Marketplace.

## Packages and Artifacts

| Package | Version source | Build command | Release artifact | Publish command |
|---------|----------------|---------------|------------------|-----------------|
| VS Code extension `jackboylan.yakanban` | `package.json` | `npm run build` | `yakanban-<version>.vsix` | `npm run publish` |

When this repo grows additional packages, add each package to this table and extend the manual checklist with that package's build, verification, artifact, and publish steps.

## Prerequisites

- A Marketplace publisher named `jackboylan`.
- A valid Azure DevOps token with Marketplace manage permissions.
- `VSCE_PAT` available in the shell that runs `vsce publish`.
- Dependencies installed with `npm ci`.

Do not print or commit the token.

## Initial Release History

The first Marketplace publish was cut on 2026-05-15.

`v0.1.0` was the initial Marketplace release:

```bash
npm install
npm run build
npm run package
source "$HOME/.config/zsh/secrets.zsh"
npm run publish
```

`v0.1.1` was published immediately after to fix the first-activation path when the YAKanban activity view activates the extension:

```bash
npm version patch --no-git-tag-version
npm run package
source "$HOME/.config/zsh/secrets.zsh"
npm run publish
```

`v0.2.0` was published on 2026-05-16 as a minor release adding a board-level copy-ID affordance for ticket references:

```bash
npm version minor --no-git-tag-version
npm ci
npm audit --omit=optional
npm run build
npm run package
source "$HOME/.config/zsh/secrets.zsh"
npm run publish
```

`v0.2.1` was published on 2026-05-16 as a patch release to keep ticket ID and delete controls visible in every card header, replace ticket delete's browser-native confirmation with an in-webview dialog, and version webview assets to avoid stale script/style reuse after extension updates:

```bash
npm version patch --no-git-tag-version
npm audit --omit=optional
npm run build
npm run package
source "$HOME/.config/zsh/secrets.zsh"
npm run publish
```

Published extension:

```text
jackboylan.yakanban
```

Marketplace URL:

```text
https://marketplace.visualstudio.com/items?itemName=jackboylan.yakanban
```

## Manual Release Checklist

1. Start from the release branch and inspect local changes:

```bash
git status --short
```

2. Update release notes:

```bash
$EDITOR CHANGELOG.md
```

3. Choose the SemVer bump:

```bash
npm version patch --no-git-tag-version
```

Use `minor` for new user-facing functionality and `major` for breaking changes.

4. Install from the lockfile:

```bash
npm ci
```

5. Run verification:

```bash
npm audit --omit=optional
npm run build
npm run package
```

6. Confirm the generated package name matches the manifest version:

```bash
node -p 'require("./package.json").version'
ls yakanban-*.vsix
```

7. Inspect the package output from `npm run package`.

The VSIX should include only runtime files such as:

```text
extension/package.json
extension/readme.md
extension/changelog.md
extension/LICENSE.txt
extension/out/extension.js
extension/webview/main.js
extension/webview/styles.css
extension/media/kanban-icon.svg
```

It should not include `src/`, `node_modules/`, `.yakanban/`, `progress/`, `package-lock.json`, release playbooks, or source maps.

8. Optionally install the VSIX locally before publishing:

```bash
code --install-extension yakanban-<version>.vsix
```

9. Publish to the Marketplace:

```bash
source "$HOME/.config/zsh/secrets.zsh"
npm run publish
```

10. Verify the publish output says:

```text
Published jackboylan.yakanban v<version>.
```

The Marketplace page can take a few minutes to show the latest version.

## Future Releases

For normal future releases, keep the same flow:

```bash
npm ci
npm audit --omit=optional
npm version patch --no-git-tag-version
npm run package
source "$HOME/.config/zsh/secrets.zsh"
npm run publish
```

Then commit the release changes, including:

- `package.json`
- `package-lock.json`
- `CHANGELOG.md`
- Any source or asset changes included in the release

Do not commit generated `.vsix` files unless there is a specific reason to archive one in the repository.

## Versioning Policy

- `patch`: bug fixes, documentation-only release metadata changes, small compatibility fixes.
- `minor`: new commands, new board features, UI additions, new supported workflows.
- `major`: breaking changes to ticket file format, board layout, command behavior, or supported VS Code engine range.

## Package Configuration

Packaging is controlled by:

- `package.json`: extension metadata, scripts, version, publisher, activation events.
- `.vscodeignore`: files excluded from the VSIX.
- `esbuild.mjs`: bundles `src/extension.ts` to `out/extension.js`.

Production builds intentionally omit source maps. Watch mode still creates source maps for local development.

## Recovery Notes

If publishing fails with authentication errors, verify that:

- `VSCE_PAT` is available in the shell.
- The token has Marketplace manage permissions.
- The token is scoped to all accessible organizations.
- The `publisher` field in `package.json` is still `jackboylan`.

If a bad release is published, cut a fixed patch release rather than trying to mutate the already-published package.
