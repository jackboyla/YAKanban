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
