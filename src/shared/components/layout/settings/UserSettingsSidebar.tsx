import { PackageIcon, PuzzleIcon, RocketIcon, ServerIcon, SettingsIcon, SparklesIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { UserSettingsSection } from "./UserSettingsModal";

export function SettingsSidebar({
  activeSection,
  onSectionChange,
}: {
  activeSection: UserSettingsSection;
  onSectionChange: (section: UserSettingsSection) => void;
}) {
  return (
    <aside className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] border-border/70 border-r bg-muted/20 px-3 py-5 max-sm:border-r-0 max-sm:border-b">
      <div className="mb-6 px-2">
        <h2 className="font-semibold text-base">設定</h2>
        <p className="mt-1 text-muted-foreground text-xs">
          模型商、平台、部署與擴充套件管理。
        </p>
      </div>

      <nav aria-label="使用者設定分類" className="grid content-start gap-1.5">
        <SettingsNavButton
          active={activeSection === "model-providers"}
          icon={<SettingsIcon aria-hidden="true" className="size-4" />}
          label="模型商"
          onClick={() => onSectionChange("model-providers")}
        />
        <SettingsNavButton
          active={activeSection === "models"}
          icon={<SparklesIcon aria-hidden="true" className="size-4" />}
          label="模型"
          onClick={() => onSectionChange("models")}
        />
        <SettingsNavButton
          active={activeSection === "npm-packages"}
          icon={<PackageIcon aria-hidden="true" className="size-4" />}
          label="NPM 套件"
          onClick={() => onSectionChange("npm-packages")}
        />
        <SettingsNavButton
          active={activeSection === "extensions"}
          icon={<PuzzleIcon aria-hidden="true" className="size-4" />}
          label="擴充套件"
          onClick={() => onSectionChange("extensions")}
        />
        <SettingsNavButton
          active={activeSection === "platform-management"}
          icon={<ServerIcon aria-hidden="true" className="size-4" />}
          label="平台管理"
          onClick={() => onSectionChange("platform-management")}
        />
        <SettingsNavButton
          active={activeSection === "deployment-platforms"}
          icon={<RocketIcon aria-hidden="true" className="size-4" />}
          label="自動部屬平台"
          onClick={() => onSectionChange("deployment-platforms")}
        />
      </nav>

      <div className="px-2 pt-6 text-muted-foreground text-xs leading-5">
        <p className="font-semibold">OpenCode Desktop</p>
        <p>v1.16.0</p>
      </div>
    </aside>
  );
}

function SettingsNavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex h-9 items-center gap-2 rounded-md px-3 text-left font-medium text-sm transition ${active ? "bg-accent text-foreground shadow-sm/5" : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"}`}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}
