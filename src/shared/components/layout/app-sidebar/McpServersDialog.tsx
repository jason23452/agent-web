import {
  ArrowLeftIcon,
  CheckIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  ServerIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/components/ui/empty";
import { Input } from "@/shared/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/components/ui/input-group";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/shared/components/ui/menu";
import type { McpDialogView, McpForm, McpServer } from "./types";

type McpServersDialogProps = {
  filteredServers: McpServer[];
  form: McpForm;
  onClose: () => void;
  onDeleteServer: (serverId: string) => void;
  onEditServer: (server: McpServer) => void;
  onFormChange: (updates: Partial<McpForm>) => void;
  onOpenAddServer: () => void;
  onSearchChange: (value: string) => void;
  onSetDefaultServer: (serverId: string) => void;
  onSubmit: () => void;
  onViewChange: (view: McpDialogView) => void;
  open: boolean;
  search: string;
  view: McpDialogView;
};

export function McpServersDialog({
  filteredServers,
  form,
  onClose,
  onDeleteServer,
  onEditServer,
  onFormChange,
  onOpenAddServer,
  onSearchChange,
  onSetDefaultServer,
  onSubmit,
  onViewChange,
  open,
  search,
  view,
}: McpServersDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/28 p-4"
      role="presentation"
    >
      <section
        aria-label={
          view === "list" ? "服務器" : view === "add" ? "添加服務器" : "編輯服務器"
        }
        className="w-full max-w-[640px] overflow-hidden rounded-xl border bg-background shadow-[0_20px_60px_rgb(0_0_0_/_20%)]"
      >
        <div className="flex h-14 items-center justify-between gap-4 px-5">
          <div className="flex min-w-0 items-center gap-2">
            {view !== "list" && (
              <button
                aria-label="返回服務器列表"
                className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onViewChange("list")}
                type="button"
              >
                <ArrowLeftIcon aria-hidden="true" className="size-4" />
              </button>
            )}
            <h2 className="truncate font-semibold text-base">
              {view === "list" ? "服務器" : view === "add" ? "添加服務器" : "編輯服務器"}
            </h2>
          </div>
          <button
            aria-label="關閉服務器"
            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onClose}
            type="button"
          >
            <XIcon aria-hidden="true" className="size-4" />
          </button>
        </div>

        {view === "list" ? (
          <div className="grid gap-4 px-6 pb-6">
            <InputGroup data-size="sm">
              <InputGroupAddon>
                <SearchIcon aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                aria-label="搜索服務器"
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="搜索服務器"
                value={search}
              />
              {search && (
                <InputGroupAddon align="inline-end">
                  <button
                    aria-label="清除服務器搜尋"
                    className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onSearchChange("")}
                    type="button"
                  >
                    <XIcon aria-hidden="true" className="size-3.5" />
                  </button>
                </InputGroupAddon>
              )}
            </InputGroup>

            <ul className="grid min-h-24 gap-2">
              {filteredServers.map((server) => (
                <li key={server.id}>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/55 px-4 py-3">
                    <span
                      aria-hidden="true"
                      className="size-1.5 shrink-0 rounded-full bg-green-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-semibold text-sm">
                          {server.url.replace(/^https?:\/\//, "")}
                        </span>
                        <span className="shrink-0 text-muted-foreground text-xs">
                          {server.version}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-muted-foreground text-sm">
                        {server.username || "無用戶名"}
                      </p>
                    </div>
                    {server.isDefault && (
                      <CheckIcon
                        aria-hidden="true"
                        className="size-4 shrink-0 text-muted-foreground"
                      />
                    )}
                    <Menu>
                      <MenuTrigger className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <MoreHorizontalIcon aria-hidden="true" className="size-4" />
                      </MenuTrigger>
                      <MenuPopup align="end" className="min-w-32">
                        <MenuItem onClick={() => onEditServer(server)}>編輯</MenuItem>
                        <MenuItem onClick={() => onSetDefaultServer(server.id)}>
                          設為默認
                        </MenuItem>
                        <MenuSeparator />
                        <MenuItem
                          onClick={() => onDeleteServer(server.id)}
                          variant="destructive"
                        >
                          刪除
                        </MenuItem>
                      </MenuPopup>
                    </Menu>
                  </div>
                </li>
              ))}
              {filteredServers.length === 0 && (
                <li>
                  <Empty className="rounded-lg border border-dashed bg-background px-3 py-8 md:py-8">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <ServerIcon aria-hidden="true" />
                      </EmptyMedia>
                      <EmptyTitle className="text-sm">沒有符合的服務器</EmptyTitle>
                      <EmptyDescription className="text-xs">
                        請換個關鍵字或新增服務器。
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </li>
              )}
            </ul>

            <div>
              <Button onClick={onOpenAddServer} size="sm" variant="outline">
                <PlusIcon aria-hidden="true" />
                添加服務器
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 px-6 pb-6">
            <div className="grid gap-4 rounded-lg bg-muted/45 p-5">
              <label className="grid gap-2 text-muted-foreground text-sm">
                服務器 URL
                <Input
                  aria-label="服務器 URL"
                  onChange={(event) => onFormChange({ url: event.target.value })}
                  placeholder="http://localhost:4096"
                  value={form.url}
                />
              </label>
              <label className="grid gap-2 text-muted-foreground text-sm">
                服務器名稱（可選）
                <Input
                  aria-label="服務器名稱"
                  onChange={(event) => onFormChange({ name: event.target.value })}
                  placeholder="Localhost"
                  value={form.name}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-muted-foreground text-sm">
                  用戶名（可選）
                  <Input
                    aria-label="用戶名"
                    onChange={(event) =>
                      onFormChange({ username: event.target.value })
                    }
                    placeholder="用戶名"
                    value={form.username}
                  />
                </label>
                <label className="grid gap-2 text-muted-foreground text-sm">
                  密碼（可選）
                  <Input
                    aria-label="密碼"
                    onChange={(event) =>
                      onFormChange({ password: event.target.value })
                    }
                    placeholder="密碼"
                    type="password"
                    value={form.password}
                  />
                </label>
              </div>
            </div>

            <div>
              <Button disabled={!form.url.trim()} onClick={onSubmit}>
                {view === "add" ? "添加服務器" : "保存"}
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
