import matter from "gray-matter";

export interface Comment {
  author: string;
  date: string;
  text: string;
}

export interface Ticket {
  slug: string;
  title: string;
  column: string;
  order: number;
  created: string;
  modified: string;
  tags: string[];
  comments: Comment[];
  body: string;
}

export interface TicketFile {
  name: string;
  raw: string;
}

export interface TicketParseResult {
  tickets: Ticket[];
  errors: Array<{ name: string; message: string }>;
}

interface MatterResult {
  data: Record<string, unknown>;
  content: string;
}

export function parseTicketFiles(files: TicketFile[]): TicketParseResult {
  const tickets: Ticket[] = [];
  const errors: Array<{ name: string; message: string }> = [];

  for (const file of files) {
    try {
      tickets.push(parseTicketFile(file.name, file.raw));
    } catch (error) {
      errors.push({
        name: file.name,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  tickets.sort((a, b) => a.order - b.order);
  return { tickets, errors };
}

export function parseTicketFile(name: string, raw: string): Ticket {
  const fallbackTitle = name.replace(/\.md$/, "");
  const { data, content } = parseMatter(raw);

  return {
    slug: fallbackTitle,
    title: toString(data.title, fallbackTitle),
    column: toString(data.column, "todo"),
    order: toNumber(data.order, 0),
    created: toString(data.created, ""),
    modified: toString(data.modified, toString(data.created, "")),
    tags: toStringArray(data.tags),
    comments: toComments(data.comments),
    body: content.trim(),
  };
}

function parseMatter(raw: string): MatterResult {
  try {
    const parsed = matter(raw);
    return { data: parsed.data, content: parsed.content };
  } catch (initialError) {
    const repaired = repairUnquotedColonScalars(raw);
    if (repaired !== raw) {
      try {
        const parsed = matter(repaired);
        return { data: parsed.data, content: parsed.content };
      } catch {
        // Fall through to the lightweight parser below.
      }
    }

    const parsed = parseLooseFrontmatter(raw);
    if (parsed) {
      return parsed;
    }

    throw initialError;
  }
}

function repairUnquotedColonScalars(raw: string): string {
  const parts = splitFrontmatter(raw);
  if (!parts) return raw;

  const repairedFrontmatter = parts.frontmatter
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^(\s*(?:-\s*)?[A-Za-z_][\w-]*:\s*)(\S.*)$/);
      if (!match) return line;

      const [, prefix, value] = match;
      if (!needsQuoting(value)) return line;
      return `${prefix}${JSON.stringify(value.trim())}`;
    })
    .join("\n");

  return `---\n${repairedFrontmatter}\n---\n${parts.body}`;
}

function needsQuoting(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.includes(":")) return false;
  if (/^['"`[{>|!]/.test(trimmed)) return false;
  return true;
}

function parseLooseFrontmatter(raw: string): MatterResult | null {
  const parts = splitFrontmatter(raw);
  if (!parts) return null;

  const data: Record<string, unknown> = {};
  for (const line of parts.frontmatter.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    data[key] = parseLooseValue(rawValue);
  }

  return { data, content: parts.body };
}

function splitFrontmatter(
  raw: string
): { frontmatter: string; body: string } | null {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;
  return { frontmatter: match[1], body: match[2] };
}

function parseLooseValue(rawValue: string): unknown {
  const value = rawValue.trim();
  if (value === "") return "";
  if (value === "[]") return [];
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);

  const inlineArray = value.match(/^\[(.*)\]$/);
  if (inlineArray) {
    const body = inlineArray[1].trim();
    if (!body) return [];
    return body.split(",").map((item) => stripQuotes(item.trim()));
  }

  return stripQuotes(value);
}

function stripQuotes(value: string): string {
  const quote = value[0];
  if ((quote === "'" || quote === '"') && value.endsWith(quote)) {
    return value.slice(1, -1);
  }
  return value;
}

function toString(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => toString(item, "").trim())
    .filter(Boolean);
}

function toComments(value: unknown): Comment[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => {
      return typeof item === "object" && item !== null;
    })
    .map((item) => ({
      author: toString(item.author, ""),
      date: toString(item.date, ""),
      text: toString(item.text, ""),
    }));
}
