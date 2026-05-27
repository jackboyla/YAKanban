# YAKanban — Yet Another Kanban

Lightweight file-based Kanban board for VS Code. Tickets are stored as markdown files so both humans and AI agents can read, create, move, and comment on them directly on disk.

## Quick Start

Install the latest VSCode marketplace extension at https://marketplace.visualstudio.com/items?itemName=jackboylan.yakanban

or go from source:

1. Open this repo in VSCode and install the extension (F5 from this repo)
2. Open a workspace in VS Code

Click the **YAKanban icon** in the activity bar — it auto-initializes if no board exists

A `.yakanban/` directory is created in your workspace with default columns (To Do, In Progress, Done) and a `tickets/` folder.

You can give an agent the Skill to use Yakanban by adding `SKILL.md` from https://github.com/jackboyla/YAKanban/blob/main/SKILL.md:

```bash
mkdir -p ~/.agents/skills/yakanban-board
curl -s https://raw.githubusercontent.com/jackboyla/YAKanban/main/SKILL.md -o ~/.agents/skills/yakanban-board/SKILL.md
```

## How It Works

Each workspace folder gets its own board stored as plain files:

```
.yakanban/
  board.yml          # column definitions (ordered)
  tickets/
    1747312200000-fix-login-bug.md
    1747312500000-add-dark-mode.md
```

Tickets are markdown with YAML frontmatter:

```markdown
---
title: Fix login bug
column: in-progress
order: 1
created: '2026-05-15T10:30:00.000Z'
modified: '2026-05-15T11:45:00.000Z'
tags: [bug, auth]
comments:
  - author: Jack
    date: '2026-05-15T11:00:00.000Z'
    text: Linked to PR #42
  - author: Claude
    date: '2026-05-15T11:45:00.000Z'
    text: Root cause was a stale session token
---

Description goes here.
```

Filenames are timestamp-prefixed (`{epoch}-{slug}.md`) to avoid collisions.

## Features

- **File watcher** — board auto-refreshes when files change on disk
- **Multi-root workspaces** — each folder gets its own collapsible board section

## For AI Agents

Add this to your `CLAUDE.md` or `agents.md`:

```
This project uses a file-based Kanban board. Read .yakanban/board.yml for columns and .yakanban/tickets/*.md for tickets (YAML frontmatter: title, column, order, created, modified, tags, comments[{author,date,text}]; body is the description).
```

Agents can manage tickets without the extension:

```bash
# List tickets
ls .yakanban/tickets/

# Read a ticket
cat .yakanban/tickets/1747312200000-fix-login-bug.md

# Create a ticket
cat > .yakanban/tickets/$(date +%s)000-my-task.md << 'EOF'
---
title: My task
column: todo
order: 0
created: '2026-05-15T10:30:00.000Z'
modified: '2026-05-15T10:30:00.000Z'
tags: []
---

Description here.
EOF

# Add a comment (edit the frontmatter comments array)
```

## Commands

| Command | Description |
|---------|-------------|
| **YAKanban: Open Kanban Board** | Open the board in an editor tab |
| **YAKanban: Initialize Board** | Create `.yakanban/` in a workspace folder |
| **YAKanban: Add Ticket** | Quick-add a ticket via input prompt |
| **YAKanban: Add Column** | Add a new column to the board |

## Development

```bash
npm install
npm run build      # one-shot build
npm run watch      # rebuilds on save
```

Press F5 to launch the Extension Development Host.

### Project Structure

```
src/
  extension.ts         # entry point, registers commands
  board.ts             # read/write .yakanban/ files (tickets, columns, comments)
  webviewProvider.ts   # manages the webview panel + sidebar view
  fileWatcher.ts       # watches for external file changes
  utils.ts             # slugify, ID generation, timestamps
webview/
  main.js              # kanban UI (vanilla JS, HTML5 drag-and-drop)
  styles.css           # VS Code theme-aware styles
media/
  kanban-icon.svg      # activity bar icon
```

### Packaging

```bash
npm ci
npm run build
npm run package
```

See [RELEASE.md](RELEASE.md) for the full release and Marketplace publishing process.
