import * as vscode from "vscode";
import { KanbanPanelManager } from "./webviewProvider";
import { boardExists, initBoard, readColumns, writeTicket, writeColumns } from "./board";
import { slugify, generateId, toDateString } from "./utils";

let panelManager: KanbanPanelManager;

export function activate(context: vscode.ExtensionContext): void {
  panelManager = new KanbanPanelManager(context.extensionUri);
  context.subscriptions.push(panelManager);

  const treeView = vscode.window.createTreeView("yakanban.boardView", {
    treeDataProvider: {
      getTreeItem: () => new vscode.TreeItem(""),
      getChildren: () => [],
    },
  });
  const openVisibleBoard = () => {
    void panelManager.openBoard();
  };
  treeView.onDidChangeVisibility((e) => {
    if (e.visible) {
      openVisibleBoard();
    }
  });
  if (treeView.visible) {
    openVisibleBoard();
  }
  context.subscriptions.push(treeView);

  context.subscriptions.push(
    vscode.commands.registerCommand("yakanban.openBoard", () =>
      panelManager.openBoard()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("yakanban.init", async () => {
      const folder = await pickFolder();
      if (!folder) return;
      if (await boardExists(folder.uri)) {
        vscode.window.showInformationMessage(
          `Board already exists in ${folder.name}`
        );
        return;
      }
      await initBoard(folder.uri);
      vscode.window.showInformationMessage(
        `Board initialized in ${folder.name}`
      );
      await panelManager.openBoard();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("yakanban.addTicket", async () => {
      const folder = await pickFolder();
      if (!folder) return;
      if (!(await boardExists(folder.uri))) {
        const init = await vscode.window.showInformationMessage(
          `No board in ${folder.name}. Initialize one?`,
          "Yes",
          "No"
        );
        if (init !== "Yes") return;
        await initBoard(folder.uri);
      }

      const title = await vscode.window.showInputBox({
        prompt: "Ticket title",
        placeHolder: "What needs to be done?",
      });
      if (!title) return;

      const columns = await readColumns(folder.uri);
      const column = await vscode.window.showQuickPick(
        columns.map((c) => ({ label: c.name, id: c.id })),
        { placeHolder: "Select column" }
      );
      if (!column) return;

      const now = toDateString();
      await writeTicket(folder.uri, {
        title,
        column: column.id,
        order: 0,
        created: now,
        modified: now,
        tags: [],
        comments: [],
        body: "",
      });

      vscode.window.showInformationMessage(`Ticket "${title}" created`);
      panelManager.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("yakanban.addColumn", async () => {
      const folder = await pickFolder();
      if (!folder) return;
      if (!(await boardExists(folder.uri))) {
        vscode.window.showWarningMessage(
          `No board in ${folder.name}. Run "Initialize Board" first.`
        );
        return;
      }

      const name = await vscode.window.showInputBox({
        prompt: "Column name",
        placeHolder: "e.g. Review, Blocked",
      });
      if (!name) return;

      const columns = await readColumns(folder.uri);
      const id = slugify(name) || generateId();
      columns.push({ id, name });
      await writeColumns(folder.uri, columns);
      vscode.window.showInformationMessage(`Column "${name}" added`);
      panelManager.refresh();
    })
  );
}

async function pickFolder(): Promise<vscode.WorkspaceFolder | undefined> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    vscode.window.showWarningMessage("No workspace folder open");
    return undefined;
  }
  if (folders.length === 1) return folders[0];

  const picked = await vscode.window.showQuickPick(
    folders.map((f) => ({ label: f.name, folder: f })),
    { placeHolder: "Select workspace folder" }
  );
  return picked?.folder;
}

export function deactivate(): void {}
