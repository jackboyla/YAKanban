import assert from "node:assert/strict";
import { rm, mkdir } from "node:fs/promises";
import { test } from "node:test";
import { createRequire } from "node:module";
import path from "node:path";
import { build } from "esbuild";

const buildDir = path.resolve(".test-build");
const parserOutfile = path.join(buildDir, "ticketParser.cjs");

await rm(buildDir, { recursive: true, force: true });
await mkdir(buildDir, { recursive: true });
await build({
  entryPoints: ["src/ticketParser.ts"],
  outfile: parserOutfile,
  bundle: true,
  platform: "node",
  format: "cjs",
  sourcemap: false,
});

const require = createRequire(import.meta.url);
const { parseTicketFile, parseTicketFiles } = require(parserOutfile);

test("parses agent-written ticket titles with unquoted colons", () => {
  const ticket = parseTicketFile(
    "1778933275000-overfit-literal-reference-soap-prompt.md",
    `---
title: overfit: literal reference SOAP prompt
column: done
order: 3
created: '2026-05-16T16:07:55.000Z'
modified: '2026-05-16T21:45:00.000Z'
tags: [experiment, overfit]
---
Use a reference-reproduction prompt.
`
  );

  assert.equal(ticket.slug, "1778933275000-overfit-literal-reference-soap-prompt");
  assert.equal(ticket.title, "overfit: literal reference SOAP prompt");
  assert.equal(ticket.column, "done");
  assert.equal(ticket.order, 3);
  assert.deepEqual(ticket.tags, ["experiment", "overfit"]);
  assert.equal(ticket.body, "Use a reference-reproduction prompt.");
});

test("a malformed ticket does not hide the rest of the board", () => {
  const result = parseTicketFiles([
    {
      name: "100-valid.md",
      raw: `---
title: Valid ticket
column: todo
order: 0
---
Visible.
`,
    },
    {
      name: "200-agent-title.md",
      raw: `---
title: overfit: generation stop and exact-match diagnostics
column: done
order: 1
---
Also visible.
`,
    },
    {
      name: "300-loose-fallback.md",
      raw: `---
title: [not valid yaml
column: in-progress
order: 2
---
Still visible through the loose parser.
`,
    },
  ]);

  assert.deepEqual(
    result.tickets.map((ticket) => ticket.title),
    [
      "Valid ticket",
      "overfit: generation stop and exact-match diagnostics",
      "[not valid yaml",
    ]
  );
  assert.deepEqual(
    result.tickets.map((ticket) => ticket.column),
    ["todo", "done", "in-progress"]
  );
  assert.deepEqual(result.errors, []);
});
