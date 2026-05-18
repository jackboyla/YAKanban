import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

class FakeElement {
  constructor(tagName, className = "") {
    this.tagName = tagName;
    this.className = className;
    this.children = [];
    this.dataset = {};
    this.listeners = {};
    this.parentNode = null;
    this.value = "";
    this.focused = false;
    this.removed = false;
    this.textContent = "";
    this.style = {};
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  prepend(child) {
    child.parentNode = this;
    this.children.unshift(child);
    return child;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    if (selector === ".inline-input") {
      return this.children.filter((child) => child.className === "inline-input");
    }
    if (selector === ".column-title") {
      return this.children.filter((child) => child.className === "column-title");
    }
    return [];
  }

  replaceWith(replacement) {
    if (!this.parentNode) return;
    const index = this.parentNode.children.indexOf(this);
    if (index >= 0) {
      replacement.parentNode = this.parentNode;
      this.parentNode.children[index] = replacement;
      this.parentNode = null;
    }
  }

  remove() {
    this.removed = true;
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter(
      (child) => child !== this
    );
    this.parentNode = null;
  }

  focus() {
    this.focused = true;
  }

  select() {
    this.selected = true;
  }

  setAttribute(name, value) {
    this[name] = value;
  }
}

function loadWebview({ columnCards = [], addColumns = [], columns = [] } = {}) {
  const posted = [];
  const created = [];
  const code = vm.runInNewContext;

  const document = {
    body: new FakeElement("body"),
    createElement(tagName) {
      const element = new FakeElement(tagName);
      created.push(element);
      return element;
    },
    execCommand() {
      return true;
    },
    getElementById() {
      return null;
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] ?? null;
    },
    querySelectorAll(selector) {
      if (selector === ".column-cards") return columnCards;
      if (selector === ".add-column") return addColumns;
      if (selector === ".column") return columns;
      if (selector === ".context-menu") return [];
      if (selector === ".modal-overlay") return [];
      if (selector === ".confirm-overlay") return [];
      return [];
    },
  };

  const context = {
    acquireVsCodeApi: () => ({
      getState: () => null,
      postMessage: (message) => posted.push(message),
      setState: () => {},
    }),
    console,
    document,
    navigator: {},
    setTimeout,
    window: {
      addEventListener: () => {},
      innerHeight: 800,
      innerWidth: 1200,
    },
  };

  return readFile("webview/main.js", "utf8").then((script) => {
    code(script, context, { filename: "webview/main.js" });
    return { context, created, posted };
  });
}

function keyedElement(className, folder, columnId) {
  const element = new FakeElement("div", className);
  element.dataset.folder = folder;
  if (columnId) element.dataset.columnId = columnId;
  return element;
}

function normalMessage(message) {
  return JSON.parse(JSON.stringify(message));
}

test("inline add ticket targets the clicked repo when column ids match", async () => {
  const firstRepoTodo = keyedElement("column-cards", "file:///repo-a", "todo");
  const secondRepoTodo = keyedElement("column-cards", "file:///repo-b", "todo");
  const { context, posted } = await loadWebview({
    columnCards: [firstRepoTodo, secondRepoTodo],
  });

  context.promptAddTicket("file:///repo-b", "todo");

  assert.equal(firstRepoTodo.children.length, 0);
  assert.equal(secondRepoTodo.children.length, 1);

  const input = secondRepoTodo.children[0];
  input.value = "Repo B ticket";
  input.listeners.keydown({ key: "Enter" });

  assert.deepEqual(normalMessage(posted.at(-1)), {
    type: "addTicket",
    folder: "file:///repo-b",
    title: "Repo B ticket",
    column: "todo",
  });
});

test("inline add column targets the clicked repo section", async () => {
  const firstRepoAddColumn = keyedElement("add-column", "file:///repo-a");
  const secondRepoAddColumn = keyedElement("add-column", "file:///repo-b");
  const { context, posted } = await loadWebview({
    addColumns: [firstRepoAddColumn, secondRepoAddColumn],
  });

  context.promptAddColumn("file:///repo-b");

  assert.equal(firstRepoAddColumn.children.length, 0);
  assert.equal(secondRepoAddColumn.children.length, 1);

  const input = secondRepoAddColumn.children[0];
  input.value = "Blocked";
  input.listeners.keydown({ key: "Enter" });

  assert.deepEqual(normalMessage(posted.at(-1)), {
    type: "addColumn",
    folder: "file:///repo-b",
    name: "Blocked",
  });
});

test("column lookup includes folder identity", async () => {
  const firstRepoTodo = keyedElement("column", "file:///repo-a", "todo");
  const secondRepoTodo = keyedElement("column", "file:///repo-b", "todo");
  const secondRepoTitle = new FakeElement("span", "column-title");
  secondRepoTodo.appendChild(secondRepoTitle);

  const { context } = await loadWebview({
    columns: [firstRepoTodo, secondRepoTodo],
  });

  assert.equal(
    context.findColumnElement("file:///repo-b", "todo"),
    secondRepoTodo
  );
});
