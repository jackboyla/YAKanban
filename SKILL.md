---
name: yakanban-board
description: Use when working with YAKanban, .yakanban boards, board.yml, markdown tickets, task tracking, ticket creation, ticket movement, comments, or agent-readable Kanban workflows.
---

# YAKanban

YAKanban is a file-based Kanban board.

Board files:

```text
.yakanban/
  board.yml
  tickets/
    <epoch>-<slug>.md
````

## Rules

* Read `.yakanban/board.yml` before editing tickets.
* Read existing `.yakanban/tickets/*.md` before creating tickets.
* Do not duplicate tickets; update a matching existing ticket instead.
* Use only column ids that exist in `board.yml`.
* Preserve unknown frontmatter fields.
* Update `modified` whenever changing a ticket.
* Do not mark tickets done unless the work is actually complete.

## Bootstrap

If the user asks to use YAKanban and no board exists, create:

```yaml
columns:
  - id: todo
    name: To Do
  - id: in-progress
    name: In Progress
  - id: done
    name: Done
```

at `.yakanban/board.yml`, and create `.yakanban/tickets/`.

## Ticket format

```markdown
---
title: Example task
column: todo
order: 0
created: '2026-05-27T12:00:00.000Z'
modified: '2026-05-27T12:00:00.000Z'
tags: []
comments: []
---

## Goal

What needs to happen.

## Acceptance criteria

- Concrete completion criterion.

## Notes

Useful context for humans and agents.
```

## Creating tickets

Before creating a ticket:

1. Search existing ticket titles and bodies.
2. If a related ticket exists, add/update context there.
3. Otherwise create a new ticket in `todo`.
4. Set `order` to the next integer in that column.
5. Name files as `<epoch-ms>-<short-slug>.md`.

## Moving tickets

When moving a ticket:

1. Change `column`.
2. Adjust `order` if needed.
3. Update `modified`.
4. Add a concise comment when the move records meaningful progress.

## Comments

Use comments for durable handoff notes:

```yaml
comments:
  - author: Codex
    date: '2026-05-27T12:00:00.000Z'
    text: 'Implemented X; remaining follow-up is Y.'
```

## User response

After board changes, report only:

* ticket title
* ticket path
* column change, if any
* one-line summary


