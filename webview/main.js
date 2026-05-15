// @ts-check

const vscode = acquireVsCodeApi();

/** @type {Array<{folderUri: string, name: string, board: {columns: Array<{id:string,name:string}>, tickets: Array<{slug:string,title:string,column:string,order:number,created:string,modified:string,tags:string[],body:string}>}|null, initialized: boolean}>} */
let boards = [];

/** @type {Record<string, boolean>} */
let collapsed = {};

/** @type {string|null} */
let dragSlug = null;
/** @type {string|null} */
let dragFolder = null;

// Restore state
const saved = vscode.getState();
if (saved?.collapsed) collapsed = saved.collapsed;

window.addEventListener("message", (e) => {
  const msg = e.data;
  if (msg.type === "boardData") {
    boards = msg.boards;
    render();
  }
});

vscode.postMessage({ type: "ready" });

// ---- Rendering ----

function render() {
  const app = document.getElementById("app");
  if (!app) return;
  app.innerHTML = "";

  if (boards.length === 0) {
    app.innerHTML = '<div class="empty-state">No workspace folders open</div>';
    return;
  }

  for (const repo of boards) {
    app.appendChild(renderRepoSection(repo));
  }
}

function renderRepoSection(repo) {
  const section = el("div", "repo-section");
  const isCollapsed = collapsed[repo.name] ?? false;

  // Header
  const header = el("div", "repo-header");
  header.innerHTML = `
    <span class="chevron ${isCollapsed ? "collapsed" : ""}">&#9660;</span>
    <span class="repo-name">${esc(repo.name)}</span>
    <span class="ticket-count">${repo.board ? repo.board.tickets.length + " tickets" : "not initialized"}</span>
  `;
  header.addEventListener("click", () => {
    collapsed[repo.name] = !collapsed[repo.name];
    vscode.setState({ collapsed });
    render();
  });
  section.appendChild(header);

  // Body
  const body = el("div", `repo-body ${isCollapsed ? "collapsed" : ""}`);

  if (!repo.initialized) {
    const prompt = el("div", "init-prompt");
    prompt.innerHTML = `<div>No board found in this workspace folder.</div>`;
    const btn = el("button", "primary");
    btn.textContent = "Initialize Board";
    btn.addEventListener("click", () => {
      vscode.postMessage({ type: "init", folder: repo.folderUri });
    });
    prompt.appendChild(btn);
    body.appendChild(prompt);
  } else if (repo.board) {
    body.appendChild(renderBoard(repo.board, repo.folderUri, repo.name));
  }

  section.appendChild(body);
  return section;
}

function renderBoard(board, folderUri, repoName) {
  const wrapper = el("div", "board");

  for (const col of board.columns) {
    const tickets = board.tickets
      .filter((t) => t.column === col.id)
      .sort((a, b) => a.order - b.order);
    wrapper.appendChild(renderColumn(col, tickets, folderUri, board.columns));
  }

  // Add column button
  const addCol = el("div", "add-column");
  addCol.textContent = "+ Add Column";
  addCol.addEventListener("click", () => {
    promptAddColumn(folderUri);
  });
  wrapper.appendChild(addCol);

  return wrapper;
}

function renderColumn(col, tickets, folderUri, allColumns) {
  const column = el("div", "column");
  column.dataset.columnId = col.id;
  column.dataset.folder = folderUri;

  // Header
  const header = el("div", "column-header");

  const title = el("span", "column-title");
  title.textContent = col.name;
  header.appendChild(title);

  const count = el("span", "column-count");
  count.textContent = String(tickets.length);
  header.appendChild(count);

  const actions = el("div", "column-actions");

  const addBtn = iconBtn("+", "Add ticket");
  addBtn.addEventListener("click", () => promptAddTicket(folderUri, col.id));
  actions.appendChild(addBtn);

  const menuBtn = iconBtn("⋮", "Column options");
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showColumnMenu(e, col, folderUri);
  });
  actions.appendChild(menuBtn);

  header.appendChild(actions);
  column.appendChild(header);

  // Cards
  const cardsContainer = el("div", "column-cards");
  cardsContainer.dataset.columnId = col.id;

  if (tickets.length === 0) {
    const empty = el("div", "empty-state");
    empty.textContent = "No tickets";
    cardsContainer.appendChild(empty);
  }

  for (const ticket of tickets) {
    cardsContainer.appendChild(renderCard(ticket, folderUri, allColumns));
  }

  // Drop zone events
  cardsContainer.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    column.classList.add("drag-over");
  });

  cardsContainer.addEventListener("dragleave", (e) => {
    if (!cardsContainer.contains(e.relatedTarget)) {
      column.classList.remove("drag-over");
    }
  });

  cardsContainer.addEventListener("drop", (e) => {
    e.preventDefault();
    column.classList.remove("drag-over");
    if (!dragSlug || !dragFolder) return;

    const cards = [...cardsContainer.querySelectorAll(".card")];
    let newOrder = 0;
    const mouseY = e.clientY;

    // Find insertion position
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      if (mouseY > rect.top + rect.height / 2) {
        newOrder = i + 1;
      }
    }

    vscode.postMessage({
      type: "moveTicket",
      folder: dragFolder,
      slug: dragSlug,
      newColumn: col.id,
      newOrder,
    });

    dragSlug = null;
    dragFolder = null;
  });

  column.appendChild(cardsContainer);
  return column;
}

function renderCard(ticket, folderUri, allColumns) {
  const card = el("div", "card");
  card.draggable = true;
  card.dataset.slug = ticket.slug;
  card.dataset.folder = folderUri;

  // Drag events
  card.addEventListener("dragstart", (e) => {
    dragSlug = ticket.slug;
    dragFolder = folderUri;
    card.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", ticket.slug);
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
    document.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
  });

  // Click to open detail modal
  card.addEventListener("click", () => {
    openTicketModal(ticket, folderUri, allColumns);
  });

  // Context menu
  card.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    showCardMenu(e, ticket, folderUri, allColumns);
  });

  // Title
  const titleEl = el("span", "card-title");
  titleEl.textContent = ticket.title;
  card.appendChild(titleEl);

  // Description preview
  if (ticket.body) {
    const preview = el("div", "card-description");
    const firstLine = ticket.body.split("\n")[0];
    preview.textContent = firstLine.length > 80 ? firstLine.slice(0, 80) + "…" : firstLine;
    card.appendChild(preview);
  }

  // Meta row
  const meta = el("div", "card-meta");
  for (const tag of ticket.tags) {
    const tagEl = el("span", "card-tag");
    tagEl.textContent = tag;
    meta.appendChild(tagEl);
  }
  if (ticket.created) {
    const date = el("span", "card-date");
    date.textContent = formatDate(ticket.created);
    date.title = ticket.created;
    meta.appendChild(date);
  }
  card.appendChild(meta);

  // Hover actions
  const actions = el("div", "card-actions");
  const delBtn = iconBtn("×", "Delete");
  delBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (confirm(`Delete "${ticket.title}"?`)) {
      vscode.postMessage({ type: "deleteTicket", folder: folderUri, slug: ticket.slug });
    }
  });
  actions.appendChild(delBtn);
  card.appendChild(actions);

  return card;
}

// ---- Context Menus ----

function showCardMenu(e, ticket, folderUri, allColumns) {
  closeMenus();
  const menu = el("div", "context-menu");
  menu.style.left = e.clientX + "px";
  menu.style.top = e.clientY + "px";

  addMenuItem(menu, "\u{1F4C4} Open file", () => {
    vscode.postMessage({ type: "openTicket", folder: folderUri, slug: ticket.slug });
  });

  // Move to submenu
  const otherColumns = allColumns.filter((c) => c.id !== ticket.column);
  if (otherColumns.length > 0) {
    const sep = el("div", "context-menu-separator");
    menu.appendChild(sep);
    for (const col of otherColumns) {
      addMenuItem(menu, `→ ${col.name}`, () => {
        vscode.postMessage({
          type: "moveTicket",
          folder: folderUri,
          slug: ticket.slug,
          newColumn: col.id,
          newOrder: 0,
        });
      });
    }
  }

  const sep2 = el("div", "context-menu-separator");
  menu.appendChild(sep2);

  addMenuItem(menu, "\u{1F5D1} Delete", () => {
    vscode.postMessage({ type: "deleteTicket", folder: folderUri, slug: ticket.slug });
  }, true);

  document.body.appendChild(menu);
  requestAnimationFrame(() => {
    clampMenuPosition(menu);
    document.addEventListener("click", closeMenus, { once: true });
  });
}

function showColumnMenu(e, col, folderUri) {
  closeMenus();
  const menu = el("div", "context-menu");
  menu.style.left = e.clientX + "px";
  menu.style.top = e.clientY + "px";

  addMenuItem(menu, "✏ Rename", () => {
    promptRenameColumn(folderUri, col);
  });

  addMenuItem(menu, "\u{1F5D1} Delete column", () => {
    if (confirm(`Delete column "${col.name}"? Tickets won't be deleted but will lose their column assignment.`)) {
      vscode.postMessage({ type: "deleteColumn", folder: folderUri, columnId: col.id });
    }
  }, true);

  document.body.appendChild(menu);
  requestAnimationFrame(() => {
    clampMenuPosition(menu);
    document.addEventListener("click", closeMenus, { once: true });
  });
}

function addMenuItem(menu, label, onClick, danger = false) {
  const item = el("div", `context-menu-item${danger ? " danger" : ""}`);
  item.textContent = label;
  item.addEventListener("click", (e) => {
    e.stopPropagation();
    closeMenus();
    onClick();
  });
  menu.appendChild(item);
}

function closeMenus() {
  document.querySelectorAll(".context-menu").forEach((m) => m.remove());
}

function clampMenuPosition(menu) {
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    menu.style.left = window.innerWidth - rect.width - 8 + "px";
  }
  if (rect.bottom > window.innerHeight) {
    menu.style.top = window.innerHeight - rect.height - 8 + "px";
  }
}

// ---- Prompts (inline) ----

function promptAddTicket(folderUri, columnId) {
  const col = document.querySelector(`.column-cards[data-column-id="${columnId}"]`);
  if (!col) return;

  // Remove existing inputs
  col.querySelectorAll(".inline-input").forEach((el) => el.remove());

  const input = document.createElement("input");
  input.className = "inline-input";
  input.placeholder = "Ticket title…";
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      vscode.postMessage({
        type: "addTicket",
        folder: folderUri,
        title: input.value.trim(),
        column: columnId,
      });
      input.remove();
    }
    if (e.key === "Escape") {
      input.remove();
    }
  });
  input.addEventListener("blur", () => {
    setTimeout(() => input.remove(), 150);
  });

  col.prepend(input);
  input.focus();
}

function promptAddColumn(folderUri) {
  const name = prompt("Column name:");
  if (name?.trim()) {
    vscode.postMessage({ type: "addColumn", folder: folderUri, name: name.trim() });
  }
}

function promptRenameColumn(folderUri, col) {
  const name = prompt("New column name:", col.name);
  if (name?.trim() && name.trim() !== col.name) {
    vscode.postMessage({
      type: "renameColumn",
      folder: folderUri,
      columnId: col.id,
      newName: name.trim(),
    });
  }
}

// ---- Helpers ----

function el(tag, className) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

function iconBtn(text, title) {
  const btn = el("button", "icon-btn");
  btn.textContent = text;
  btn.title = title;
  return btn;
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

function formatFullDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ---- Ticket Detail Modal ----

function openTicketModal(ticket, folderUri, allColumns) {
  closeModal();

  const overlay = el("div", "modal-overlay");
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  const modal = el("div", "modal");

  // Header
  const header = el("div", "modal-header");
  const titleInput = document.createElement("input");
  titleInput.className = "modal-title-input";
  titleInput.value = ticket.title;
  titleInput.placeholder = "Ticket title…";
  header.appendChild(titleInput);

  const closeBtn = iconBtn("×", "Close");
  closeBtn.className = "modal-close-btn";
  closeBtn.addEventListener("click", closeModal);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // Timestamps
  const timestamps = el("div", "modal-timestamps");
  timestamps.innerHTML = `
    <span title="${esc(ticket.created)}">Created: ${esc(formatFullDate(ticket.created))}</span>
    <span title="${esc(ticket.modified || "")}">Modified: ${esc(formatFullDate(ticket.modified))}</span>
  `;
  modal.appendChild(timestamps);

  // Description
  const descLabel = el("label", "modal-label");
  descLabel.textContent = "Description";
  modal.appendChild(descLabel);

  const descArea = document.createElement("textarea");
  descArea.className = "modal-description";
  descArea.value = ticket.body || "";
  descArea.placeholder = "Add a description…";
  descArea.rows = 8;
  modal.appendChild(descArea);

  // Tags
  const tagsLabel = el("label", "modal-label");
  tagsLabel.textContent = "Tags (comma-separated)";
  modal.appendChild(tagsLabel);

  const tagsInput = document.createElement("input");
  tagsInput.className = "modal-tags-input";
  tagsInput.value = (ticket.tags || []).join(", ");
  tagsInput.placeholder = "e.g. bug, urgent";
  modal.appendChild(tagsInput);

  // Footer
  const footer = el("div", "modal-footer");

  const openFileBtn = el("button", "modal-btn secondary");
  openFileBtn.textContent = "Open File";
  openFileBtn.addEventListener("click", () => {
    vscode.postMessage({ type: "openTicket", folder: folderUri, slug: ticket.slug });
    closeModal();
  });
  footer.appendChild(openFileBtn);

  const spacer = el("div", "modal-spacer");
  footer.appendChild(spacer);

  const cancelBtn = el("button", "modal-btn secondary");
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", closeModal);
  footer.appendChild(cancelBtn);

  const saveBtn = el("button", "modal-btn primary");
  saveBtn.textContent = "Save";
  saveBtn.addEventListener("click", () => {
    const newTitle = titleInput.value.trim();
    if (!newTitle) return;
    const newTags = tagsInput.value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    vscode.postMessage({
      type: "editTicket",
      folder: folderUri,
      slug: ticket.slug,
      title: newTitle,
      column: ticket.column,
      order: ticket.order,
      created: ticket.created,
      tags: newTags,
      body: descArea.value,
    });
    closeModal();
  });
  footer.appendChild(saveBtn);

  modal.appendChild(footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Focus description if title already set
  if (ticket.title) {
    descArea.focus();
  } else {
    titleInput.focus();
  }

  // Escape to close
  const onKey = (e) => {
    if (e.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", onKey);
    }
  };
  document.addEventListener("keydown", onKey);
}

function closeModal() {
  document.querySelectorAll(".modal-overlay").forEach((m) => m.remove());
}
