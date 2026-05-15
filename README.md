# YAKanban

Lightweight file-based Kanban board for VS Code. Tickets are stored as markdown files so both humans and AI agents can read, create, move, and delete them directly on disk.

## Quick Start

1. Install the extension (F5 from this repo, or install the `.vsix`)
2. Open a workspace in VS Code
3. Run **YAKanban: Initialize Board** from the command palette (`Cmd+Shift+P`)
4. Run **YAKanban: Open Kanban Board** to see your board

That's it. A `.yakanban/` directory is created in your workspace with default columns (To Do, In Progress, Done) and a `tickets/` folder.

## How It Works

Each workspace folder gets its own board stored as plain files:

```
.yakanban/
  board.yml          # column definitions
  tickets/
    fix-login-bug.md
    add-dark-mode.md
```

Tickets are markdown with YAML frontmatter:

```markdown
---
title: Fix login bug
column: in-progress
order: 1
created: 2026-05-15
tags: [bug, auth]
---

Description goes here.
```

### For AI Agents

Agents can manage tickets without the extension:

```bash
# List tickets
ls .yakanban/tickets/

# Read a ticket
cat .yakanban/tickets/fix-login-bug.md

# Create a ticket (just write a markdown file)
cat > .yakanban/tickets/new-feature.md << 'EOF'
---
title: New feature
column: todo
order: 0
created: 2026-05-15
tags: []
---

Description here.
EOF

# Delete a ticket
rm .yakanban/tickets/fix-login-bug.md
```

The board auto-refreshes when files change on disk.

## Commands

| Command | Description |
|---------|-------------|
| **YAKanban: Open Kanban Board** | Open the board in an editor tab |
| **YAKanban: Initialize Board** | Create `.yakanban/` in a workspace folder |
| **YAKanban: Add Ticket** | Quick-add a ticket via input prompt |
| **YAKanban: Add Column** | Add a new column to the board |

## Multi-Root Workspaces

Each workspace folder gets its own collapsible board section. Boards are independent per repo.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode (rebuilds on save)
npm run watch
```

Press F5 in VS Code to launch the Extension Development Host with the extension loaded.

### Project Structure

```
src/
  extension.ts         # entry point, registers commands
  board.ts             # read/write .yakanban/ files
  webviewProvider.ts   # manages the webview panel
  fileWatcher.ts       # watches for external file changes
  utils.ts             # slugify, ID generation
webview/
  main.js              # kanban UI (vanilla JS, HTML5 drag-and-drop)
  styles.css           # VS Code theme-aware styles
```

### Packaging

```bash
npm install -g @vscode/vsce
vsce package
```

This produces a `.vsix` file you can install via `code --install-extension yakanban-0.1.0.vsix`.
