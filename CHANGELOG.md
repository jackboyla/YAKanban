# Changelog

## 0.2.3

- Fix multi-root board `+` actions so inline ticket creation targets the clicked repository, not the first repository in the workspace.
- Scope add-column, rename-column, and drag/drop interactions to the correct workspace folder.
- Add regression tests for multi-root inline control routing.

## 0.2.2

- Keep loading visible tickets when another ticket file has malformed frontmatter.
- Tolerate common AI-agent ticket titles that use unquoted colons in YAML frontmatter.
- Add parser regression tests for agent-written ticket files.

## 0.2.1

- Keep ticket ID copy and delete controls visible in each board card header.
- Use an in-webview delete confirmation dialog for ticket deletes from cards, context menus, and ticket details.
- Add webview asset versioning so new panels do not reuse stale scripts or styles after extension updates.

## 0.2.0

- Add a per-ticket board button for copying the ticket ID/slug for AI-agent references.

## 0.1.1

- Open the board immediately when the YAKanban activity view activates the extension.

## 0.1.0

- Initial marketplace release of YAKanban.
