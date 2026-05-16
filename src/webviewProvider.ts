import * as vscode from "vscode";
import * as path from "path";
import {
  readBoard,
  writeTicket,
  deleteTicket,
  moveTicket,
  addComment,
  boardExists,
  initBoard,
  ticketFileUri,
  writeColumns,
  readColumns,
  type Board,
  type Column,
} from "./board";
import { BoardFileWatcher } from "./fileWatcher";
import { slugify, generateId, toDateString } from "./utils";

interface RepoBoard {
  folderUri: string;
  name: string;
  board: Board | null;
  initialized: boolean;
}

export class KanbanPanelManager implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private watcher: BoardFileWatcher;
  private disposables: vscode.Disposable[] = [];
  private extensionUri: vscode.Uri;
  private extensionVersion: string;
  private refreshing = false;

  constructor(extensionUri: vscode.Uri, extensionVersion: string) {
    this.extensionUri = extensionUri;
    this.extensionVersion = extensionVersion;
    this.watcher = new BoardFileWatcher(() => this.refresh());
  }

  async openBoard(): Promise<void> {
    // Auto-initialize for single-folder workspaces
    const folders = vscode.workspace.workspaceFolders ?? [];
    if (folders.length === 1 && !(await boardExists(folders[0].uri))) {
      await initBoard(folders[0].uri);
    }

    if (this.panel) {
      this.panel.reveal();
      await this.refresh();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      "yakanban",
      "YAKanban",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.extensionUri, "webview"),
        ],
      }
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    }, null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      (msg) => this.handleMessage(msg),
      null,
      this.disposables
    );

    this.panel.webview.html = this.getHtml(this.panel.webview);

    this.setupWatchers();
    await this.refresh();
  }

  private setupWatchers(): void {
    this.watcher.dispose();
    const folders = vscode.workspace.workspaceFolders ?? [];
    for (const f of folders) {
      this.watcher.watch(f.uri);
    }
  }

  async refresh(): Promise<void> {
    if (!this.panel || this.refreshing) return;
    this.refreshing = true;
    try {
      const boards = await this.loadAllBoards();
      this.panel.webview.postMessage({ type: "boardData", boards });
    } finally {
      this.refreshing = false;
    }
  }

  private async loadAllBoards(): Promise<RepoBoard[]> {
    const folders = vscode.workspace.workspaceFolders ?? [];
    const results: RepoBoard[] = [];
    for (const f of folders) {
      const initialized = await boardExists(f.uri);
      const board = initialized ? await readBoard(f.uri) : null;
      results.push({
        folderUri: f.uri.toString(),
        name: f.name,
        board,
        initialized,
      });
    }
    return results;
  }

  private async handleMessage(msg: {
    type: string;
    [key: string]: unknown;
  }): Promise<void> {
    const folderUri = this.resolveFolder(msg.folder as string | undefined);
    if (!folderUri && msg.type !== "ready") return;

    switch (msg.type) {
      case "ready":
        await this.refresh();
        break;

      case "init": {
        if (!folderUri) return;
        await initBoard(folderUri);
        await this.refresh();
        break;
      }

      case "addTicket": {
        if (!folderUri) return;
        const title = msg.title as string;
        const column = msg.column as string;
        const tickets = (await readBoard(folderUri)).tickets.filter(
          (t) => t.column === column
        );
        const maxOrder = tickets.reduce(
          (max, t) => Math.max(max, t.order),
          -1
        );
        const now = toDateString();
        await writeTicket(folderUri, {
          title,
          column,
          order: maxOrder + 1,
          created: now,
          modified: now,
          tags: [],
          comments: [],
          body: "",
        });
        await this.refresh();
        break;
      }

      case "moveTicket": {
        if (!folderUri) return;
        const slug = msg.slug as string;
        const newColumn = msg.newColumn as string;
        const newOrder = msg.newOrder as number;
        await moveTicket(folderUri, slug, newColumn, newOrder);
        await this.refresh();
        break;
      }

      case "deleteTicket": {
        if (!folderUri) return;
        const slug = msg.slug as string;
        await deleteTicket(folderUri, slug);
        await this.refresh();
        break;
      }

      case "openTicket": {
        if (!folderUri) return;
        const slug = msg.slug as string;
        const uri = ticketFileUri(folderUri, slug);
        await vscode.window.showTextDocument(uri);
        break;
      }

      case "addColumn": {
        if (!folderUri) return;
        const name = msg.name as string;
        const id = slugify(name) || generateId();
        const columns = await readColumns(folderUri);
        columns.push({ id, name });
        await writeColumns(folderUri, columns);
        await this.refresh();
        break;
      }

      case "deleteColumn": {
        if (!folderUri) return;
        const columnId = msg.columnId as string;
        const columns = await readColumns(folderUri);
        const filtered = columns.filter((c) => c.id !== columnId);
        await writeColumns(folderUri, filtered);
        await this.refresh();
        break;
      }

      case "reorderColumns": {
        if (!folderUri) return;
        const columnId = msg.columnId as string;
        const newIndex = msg.newIndex as number;
        const columns = await readColumns(folderUri);
        const oldIndex = columns.findIndex((c) => c.id === columnId);
        if (oldIndex === -1 || oldIndex === newIndex) break;
        const [moved] = columns.splice(oldIndex, 1);
        columns.splice(newIndex, 0, moved);
        await writeColumns(folderUri, columns);
        await this.refresh();
        break;
      }

      case "renameColumn": {
        if (!folderUri) return;
        const columnId = msg.columnId as string;
        const newName = msg.newName as string;
        const columns = await readColumns(folderUri);
        const col = columns.find((c) => c.id === columnId);
        if (col) {
          col.name = newName;
          await writeColumns(folderUri, columns);
          await this.refresh();
        }
        break;
      }

      case "editTicket": {
        if (!folderUri) return;
        const slug = msg.slug as string;
        const title = msg.title as string;
        const tags = msg.tags as string[];
        const column = msg.column as string;
        const order = msg.order as number;
        const body = msg.body as string;
        const comments = (msg.comments as Array<{ author: string; date: string; text: string }>) || [];
        await writeTicket(folderUri, {
          slug,
          title,
          column,
          order,
          created: (msg.created as string) || toDateString(),
          modified: toDateString(),
          tags: tags || [],
          comments,
          body: body || "",
        });
        await this.refresh();
        break;
      }

      case "addComment": {
        if (!folderUri) return;
        const slug = msg.slug as string;
        const author = msg.author as string;
        const text = msg.text as string;
        await addComment(folderUri, slug, author, text);
        await this.refresh();
        break;
      }
    }
  }

  private resolveFolder(folderPath: string | undefined): vscode.Uri | null {
    if (!folderPath) {
      const folders = vscode.workspace.workspaceFolders;
      return folders?.[0]?.uri ?? null;
    }
    return vscode.Uri.parse(folderPath);
  }

  private getHtml(webview: vscode.Webview): string {
    const assetVersion = encodeURIComponent(this.extensionVersion);
    const styleUri = `${webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "webview", "styles.css")
    )}?v=${assetVersion}`;
    const scriptUri = `${webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "webview", "main.js")
    )}?v=${assetVersion}`;
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <link rel="stylesheet" href="${styleUri}">
  <title>YAKanban</title>
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  dispose(): void {
    this.panel?.dispose();
    this.watcher.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}

function getNonce(): string {
  let text = "";
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
