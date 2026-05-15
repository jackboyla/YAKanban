import * as vscode from "vscode";

export class BoardFileWatcher implements vscode.Disposable {
  private watchers: vscode.FileSystemWatcher[] = [];
  private onChange: () => void;

  constructor(onChange: () => void) {
    this.onChange = onChange;
  }

  watch(folder: vscode.Uri): void {
    const pattern = new vscode.RelativePattern(folder, ".yakanban/**");
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    const debounced = this.debounce(() => this.onChange(), 300);
    watcher.onDidChange(debounced);
    watcher.onDidCreate(debounced);
    watcher.onDidDelete(debounced);
    this.watchers.push(watcher);
  }

  private debounce(fn: () => void, ms: number): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
  }

  dispose(): void {
    this.watchers.forEach((w) => w.dispose());
    this.watchers = [];
  }
}
