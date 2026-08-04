import {
  HardDriveIcon,
  GlobeIcon,
  MailIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  PresentationIcon,
  Table2Icon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";

type ExtensionItem = {
  description: string;
  icon: typeof MonitorIcon;
  iconClassName: string;
  id: string;
  name: string;
};

const extensionItems: ExtensionItem[] = [
  {
    description: "Control Windows apps from your agent",
    icon: MonitorIcon,
    iconClassName: "bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500 text-white",
    id: "computer-use",
    name: "Computer Use",
  },
  {
    description: "Control Chrome with ChatGPT",
    icon: GlobeIcon,
    iconClassName: "border border-border bg-background text-foreground",
    id: "chrome",
    name: "Chrome",
  },
  {
    description: "Create and edit spreadsheet files",
    icon: Table2Icon,
    iconClassName: "bg-emerald-600/15 text-emerald-600",
    id: "spreadsheets",
    name: "Spreadsheets",
  },
  {
    description: "Create and edit presentations",
    icon: PresentationIcon,
    iconClassName: "bg-amber-500/15 text-amber-600",
    id: "presentations",
    name: "Presentations",
  },
  {
    description: "Read and manage Gmail",
    icon: MailIcon,
    iconClassName: "bg-red-500/12 text-red-600",
    id: "gmail",
    name: "Gmail",
  },
  {
    description: "Work across Drive, Docs, Sheets, and more",
    icon: HardDriveIcon,
    iconClassName: "bg-blue-500/12 text-blue-600",
    id: "google-drive",
    name: "Google Drive",
  },
];

export function ExtensionsPanel() {
  const [installedExtensionIds, setInstalledExtensionIds] = useState<Set<string>>(
    () => new Set(["spreadsheets", "presentations", "google-drive"]),
  );

  function installExtension(extensionId: string) {
    setInstalledExtensionIds((current) => {
      const next = new Set(current);
      next.add(extensionId);
      return next;
    });
  }

  return (
    <div className="mx-auto grid max-w-[720px] gap-6 pr-8 max-sm:pr-0">
      <div className="grid gap-1">
        <h3 className="font-semibold text-lg">擴充套件</h3>
        <p className="text-muted-foreground text-sm">
          安裝可在目前平台使用的額外工具與服務。
        </p>
      </div>

      <ul className="grid grid-cols-1 border-border/70 border-t sm:grid-cols-2 sm:gap-x-10">
        {extensionItems.map((extension) => {
          const Icon = extension.icon;
          const installed = installedExtensionIds.has(extension.id);

          return (
            <li
              className="flex min-w-0 items-center gap-3 border-border/70 border-b py-4"
              key={extension.id}
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl ${extension.iconClassName}`}
              >
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="truncate font-semibold text-sm">{extension.name}</h4>
                <p className="mt-1 truncate text-muted-foreground text-xs">
                  {extension.description}
                </p>
              </div>
              {installed ? (
                <button
                  aria-label={`${extension.name} 更多操作`}
                  className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  type="button"
                >
                  <MoreHorizontalIcon aria-hidden="true" className="size-4" />
                </button>
              ) : (
                <Button
                  onClick={() => installExtension(extension.id)}
                  size="sm"
                  variant="outline"
                >
                  Install
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
