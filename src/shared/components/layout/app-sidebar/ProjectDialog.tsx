import { ArrowLeftIcon, FolderIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import type { AppSidebarProject, ProjectDialogView } from "./types";

type ProjectDialogProps = {
  activeProjectPath: string;
  createName: string;
  filteredProjects: AppSidebarProject[];
  onClose: () => void;
  onConfirmCreate: () => void;
  onConfirmOpen: (path: string) => void;
  onCreateNameChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onViewChange: (view: ProjectDialogView) => void;
  open: boolean;
  search: string;
  view: ProjectDialogView;
};

export function ProjectDialog({
  activeProjectPath,
  createName,
  filteredProjects,
  onClose,
  onConfirmCreate,
  onConfirmOpen,
  onCreateNameChange,
  onSearchChange,
  onViewChange,
  open,
  search,
  view,
}: ProjectDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/28 p-4"
      role="presentation"
    >
      <section
        aria-label={view === "list" ? "打開項目" : "建立專案"}
        className="w-full max-w-[640px] overflow-hidden rounded-xl border bg-background shadow-[0_20px_60px_rgb(0_0_0_/_20%)]"
      >
        <div className="flex h-14 items-center justify-between gap-4 border-border/70 border-b px-4">
          <div className="flex min-w-0 items-center gap-2">
            {view === "create" && (
              <button
                aria-label="返回項目列表"
                className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onViewChange("list")}
                type="button"
              >
                <ArrowLeftIcon aria-hidden="true" className="size-4" />
              </button>
            )}
            <h2 className="font-semibold text-base">
              {view === "list" ? "打開項目" : "建立專案"}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {view === "list" && (
              <Button
                onClick={() => onViewChange("create")}
                size="sm"
                variant="outline"
              >
                <PlusIcon aria-hidden="true" />
                建立專案
              </Button>
            )}
            <button
              aria-label={view === "list" ? "關閉打開項目" : "關閉建立專案"}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={onClose}
              type="button"
            >
              <XIcon aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>

        <div className="p-3">
          {view === "list" ? (
            <>
              <label className="relative block">
                <span className="sr-only">搜尋文件夾</span>
                <SearchIcon
                  aria-hidden="true"
                  className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground"
                />
                <input
                  className="h-10 w-full rounded-lg border-0 bg-muted/60 pr-3 pl-10 text-sm outline-none placeholder:text-muted-foreground focus:bg-muted focus:ring-2 focus:ring-ring"
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="搜尋文件夾"
                  value={search}
                />
              </label>

              <div className="mt-6 px-1">
                <p className="mb-3 font-semibold text-muted-foreground text-xs">
                  最近項目
                </p>
                <ul className="grid min-h-28 gap-1">
                  {filteredProjects.map((project) => (
                    <li key={project.id}>
                      <button
                        className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${project.path === activeProjectPath ? "bg-accent" : ""}`}
                        onClick={() => onConfirmOpen(project.path)}
                        type="button"
                      >
                        <FolderIcon
                          aria-hidden="true"
                          className="size-4 shrink-0 text-foreground"
                        />
                        <span className="min-w-0 truncate text-muted-foreground text-sm">
                          {project.path}
                        </span>
                      </button>
                    </li>
                  ))}
                  {filteredProjects.length === 0 && (
                    <li className="px-2 py-8 text-center text-muted-foreground text-sm">
                      找不到符合的項目
                    </li>
                  )}
                </ul>
              </div>
            </>
          ) : (
            <div className="grid gap-4 rounded-xl bg-muted/35 p-5">
              <div className="grid gap-1">
                <h3 className="font-semibold text-sm">建立新專案</h3>
                <p className="text-muted-foreground text-xs">
                  輸入專案名稱，建立後會自動切換到新專案。
                </p>
              </div>
              <label className="grid gap-1.5">
                <span className="font-medium text-xs">專案名稱</span>
                <Input
                  aria-label="新專案名稱"
                  autoFocus
                  onChange={(event) => onCreateNameChange(event.target.value)}
                  placeholder="例如：agent-web"
                  value={createName}
                />
                <span className="text-muted-foreground text-xs">
                  系統會自動建立到 workspace 專案目錄。
                </span>
              </label>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => onViewChange("list")}
                  size="sm"
                  variant="outline"
                >
                  取消
                </Button>
                <Button
                  className="sm:min-w-24"
                  disabled={!createName.trim()}
                  onClick={onConfirmCreate}
                  size="sm"
                >
                  <PlusIcon aria-hidden="true" />
                  建立專案
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
