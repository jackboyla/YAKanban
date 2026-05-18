# YAKanban Progress

## Ongoing Instructions

- Keep this project progress file up to date while working through tasks and discussions.
- Preserve placeholders for vision, high-level requirements, project plan, and outstanding tasks.
- Do not expose secrets such as `VSCE_PAT`; only verify whether they are available.

## Vision

_Placeholder: capture the product direction and user experience goals here._

## High-Level Requirements

_Placeholder: capture durable functional and non-functional requirements here._

## Project Plan

- [x] Create progress tracking directory and main markdown file.
- [x] Prepare extension metadata and packaging files for VS Code Marketplace publishing.
- [x] Build and package a local `.vsix`.
- [x] Publish the patched extension as `jackboylan.yakanban v0.1.1`.
- [x] Add a release guide for initial and future extension releases.
- [x] Add a small board action for copying a ticket ID.
- [x] Release `jackboylan.yakanban v0.2.0` as a minor version.
- [x] Release `jackboylan.yakanban v0.2.1` with visible and reliable board card controls.
- [x] Fix multi-root controls so add-ticket/add-column/rename and drag/drop actions target the clicked repo section.
- [x] Release `jackboylan.yakanban v0.2.3` with the multi-root routing fix.

## Outstanding Tasks

- Marketplace listing may take a few minutes to show the latest release after publishing.
- Optional: add a PNG marketplace icon and screenshot/GIF to improve the listing.

## Conversation Log

- 2026-05-15: User confirmed Marketplace publisher `jackboylan` exists and `VSCE_PAT` is configured. Began marketplace packaging and publishing workflow.
- 2026-05-15: Added Marketplace metadata, local `@vscode/vsce`, `LICENSE`, `CHANGELOG.md`, improved `.vscodeignore`, and updated `esbuild` to clear npm audit findings.
- 2026-05-15: First VSIX packaged successfully; production source maps are being removed from the shipped extension before publishing.
- 2026-05-15: Repackaged `yakanban-0.1.0.vsix` successfully with 10 files and no source maps.
- 2026-05-15: Published `jackboylan.yakanban v0.1.0` to the VS Code Marketplace.
- 2026-05-15: Found and fixed a first-activation edge case caused by lazy view activation; preparing patch release `v0.1.1`.
- 2026-05-15: Published `jackboylan.yakanban v0.1.1` to the VS Code Marketplace.
- 2026-05-15: Added `RELEASE.md` documenting the initial release history and future release checklist.
- 2026-05-15: Expanded `RELEASE.md` with an explicit package and artifact table for future package additions.
- 2026-05-16: Began adding a small board button to copy each ticket's slug/ID for AI-agent references.
- 2026-05-16: Added a per-ticket `ID` button in the board UI that copies the ticket slug, then verified `webview/main.js` syntax and `npm run build`.
- 2026-05-16: Began minor release workflow for `jackboylan.yakanban v0.2.0`.
- 2026-05-16: Published `jackboylan.yakanban v0.2.0`; verified `npm ci`, `npm audit --omit=optional`, `npm run build`, `node --check webview/main.js`, and packaged `yakanban-0.2.0.vsix` with 10 runtime files.
- 2026-05-16: User reported the ticket ID button does not appear in an existing board after the minor release, new tickets in that board also lack the control, and board-view delete is not usable.
- 2026-05-16: Prepared `v0.2.1` patch with always-visible card header controls, in-webview ticket delete confirmation, and webview asset versioning.
- 2026-05-16: Published `jackboylan.yakanban v0.2.1`; verified `npm audit --omit=optional`, `node --check webview/main.js`, `npm run build`, and packaged `yakanban-0.2.1.vsix` with 10 runtime files.
- 2026-05-18: User reported that clicking `+` in the multi-repo board always added tickets to the first repo. Fixed shared-column-ID DOM lookups by scoping inline prompt targets to `folderUri`, blocked cross-repo drag/drop side effects, hardened webview message folder resolution so missing folders do not fall back to the first repo in multi-root workspaces, and added regression tests for add-ticket/add-column routing.
- 2026-05-18: Published `jackboylan.yakanban v0.2.3` to the VS Code Marketplace. Release checks passed: `npm ci`, `npm audit --omit=optional`, `npm run test`, `npm run build`, and `npm run package`; publish output reported `Published jackboylan.yakanban v0.2.3`.
