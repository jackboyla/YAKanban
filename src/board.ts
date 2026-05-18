import * as vscode from "vscode";
import * as yaml from "js-yaml";
import matter from "gray-matter";
import { parseTicketFile, type Comment, type Ticket } from "./ticketParser";
import { slugify, generateId, toDateString } from "./utils";

export interface Column {
  id: string;
  name: string;
}

export type { Comment, Ticket } from "./ticketParser";

export interface Board {
  columns: Column[];
  tickets: Ticket[];
}

const DEFAULT_COLUMNS: Column[] = [
  { id: "todo", name: "To Do" },
  { id: "in-progress", name: "In Progress" },
  { id: "done", name: "Done" },
];

function yakanbanUri(folder: vscode.Uri): vscode.Uri {
  return vscode.Uri.joinPath(folder, ".yakanban");
}

function boardYmlUri(folder: vscode.Uri): vscode.Uri {
  return vscode.Uri.joinPath(folder, ".yakanban", "board.yml");
}

function ticketsUri(folder: vscode.Uri): vscode.Uri {
  return vscode.Uri.joinPath(folder, ".yakanban", "tickets");
}

export async function boardExists(folder: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(boardYmlUri(folder));
    return true;
  } catch {
    return false;
  }
}

export async function initBoard(folder: vscode.Uri): Promise<void> {
  const dir = yakanbanUri(folder);
  const tickets = ticketsUri(folder);
  await vscode.workspace.fs.createDirectory(dir);
  await vscode.workspace.fs.createDirectory(tickets);
  await writeColumns(folder, DEFAULT_COLUMNS);
}

export async function readColumns(folder: vscode.Uri): Promise<Column[]> {
  try {
    const raw = await vscode.workspace.fs.readFile(boardYmlUri(folder));
    const parsed = yaml.load(Buffer.from(raw).toString("utf-8")) as {
      columns?: Column[];
    };
    return parsed?.columns ?? DEFAULT_COLUMNS;
  } catch {
    return DEFAULT_COLUMNS;
  }
}

export async function writeColumns(
  folder: vscode.Uri,
  columns: Column[]
): Promise<void> {
  const content = yaml.dump({ columns }, { flowLevel: -1 });
  await vscode.workspace.fs.writeFile(
    boardYmlUri(folder),
    Buffer.from(content, "utf-8")
  );
}

export async function readTickets(folder: vscode.Uri): Promise<Ticket[]> {
  const dir = ticketsUri(folder);
  try {
    const entries = await vscode.workspace.fs.readDirectory(dir);
    const tickets: Ticket[] = [];
    for (const [name, type] of entries) {
      if (type !== vscode.FileType.File || !name.endsWith(".md")) continue;
      try {
        const uri = vscode.Uri.joinPath(dir, name);
        const raw = Buffer.from(
          await vscode.workspace.fs.readFile(uri)
        ).toString("utf-8");
        tickets.push(parseTicketFile(name, raw));
      } catch (error) {
        console.warn(
          `[YAKanban] Failed to read ticket ${name}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
    return tickets.sort((a, b) => a.order - b.order);
  } catch {
    return [];
  }
}

export async function readBoard(folder: vscode.Uri): Promise<Board> {
  const [columns, tickets] = await Promise.all([
    readColumns(folder),
    readTickets(folder),
  ]);
  return { columns, tickets };
}

export async function writeTicket(
  folder: vscode.Uri,
  ticket: Omit<Ticket, "slug"> & { slug?: string }
): Promise<string> {
  const now = toDateString();
  const slug =
    ticket.slug ||
    `${Date.now()}-${slugify(ticket.title) || "ticket"}`;
  const uri = vscode.Uri.joinPath(ticketsUri(folder), `${slug}.md`);

  const frontmatter: Record<string, unknown> = {
    title: ticket.title,
    column: ticket.column,
    order: ticket.order,
    created: ticket.created || now,
    modified: now,
  };
  if (ticket.tags.length > 0) {
    frontmatter.tags = ticket.tags;
  }
  if (ticket.comments.length > 0) {
    frontmatter.comments = ticket.comments;
  }

  const content = matter.stringify(ticket.body || "", frontmatter);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf-8"));
  return slug;
}

export async function deleteTicket(
  folder: vscode.Uri,
  slug: string
): Promise<void> {
  const uri = vscode.Uri.joinPath(ticketsUri(folder), `${slug}.md`);
  await vscode.workspace.fs.delete(uri);
}

export async function moveTicket(
  folder: vscode.Uri,
  slug: string,
  newColumn: string,
  newOrder: number
): Promise<void> {
  const uri = vscode.Uri.joinPath(ticketsUri(folder), `${slug}.md`);
  const raw = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(
    "utf-8"
  );
  const { data, content } = matter(raw);
  data.column = newColumn;
  data.order = newOrder;
  data.modified = toDateString();
  const updated = matter.stringify(content, data);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(updated, "utf-8"));
}

export async function addComment(
  folder: vscode.Uri,
  slug: string,
  author: string,
  text: string
): Promise<void> {
  const uri = vscode.Uri.joinPath(ticketsUri(folder), `${slug}.md`);
  const raw = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(
    "utf-8"
  );
  const { data, content } = matter(raw);
  if (!Array.isArray(data.comments)) {
    data.comments = [];
  }
  data.comments.push({ author, date: toDateString(), text });
  data.modified = toDateString();
  const updated = matter.stringify(content, data);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(updated, "utf-8"));
}

export function ticketFileUri(folder: vscode.Uri, slug: string): vscode.Uri {
  return vscode.Uri.joinPath(ticketsUri(folder), `${slug}.md`);
}
