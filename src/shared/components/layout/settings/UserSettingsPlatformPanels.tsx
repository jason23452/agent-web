import { Badge } from "@/shared/components/ui/badge";

export function PlatformManagementPanel() {
  return (
    <div className="mx-auto grid max-w-[680px] gap-6">
      <div className="grid gap-1 pr-8">
        <h3 className="font-semibold text-lg">平台管理</h3>
        <p className="text-muted-foreground text-sm">
          管理可串接的工作平台與服務。
        </p>
      </div>
      <section className="grid gap-3" aria-labelledby="platform-management-title">
        <h4 className="font-semibold text-sm" id="platform-management-title">
          可用平台
        </h4>
        <button
          className="flex min-h-16 items-center justify-between gap-4 rounded-lg bg-muted/50 px-4 py-3 text-left transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#0078d4] font-semibold text-sm text-white">
              AZ
            </span>
            <div className="min-w-0">
              <strong className="truncate font-semibold text-sm">
                Azure DevOps
              </strong>
              <p className="mt-0.5 truncate text-muted-foreground text-xs">
                連接組織、專案、Repos 與 Boards。
              </p>
            </div>
          </div>
          <Badge size="sm" variant="secondary">
            尚未連接
          </Badge>
        </button>
      </section>
    </div>
  );
}

export function DeploymentPlatformsPanel() {
  return (
    <div className="mx-auto grid max-w-[680px] gap-6">
      <div className="grid gap-1 pr-8">
        <h3 className="font-semibold text-lg">自動部屬平台</h3>
        <p className="text-muted-foreground text-sm">
          管理 CI/CD、環境變數、Build hooks 與發佈狀態。
        </p>
      </div>
      <section className="grid gap-3" aria-labelledby="deployment-platforms-title">
        <h4 className="font-semibold text-sm" id="deployment-platforms-title">
          可用平台
        </h4>
        <button
          className="flex min-h-16 items-center justify-between gap-4 rounded-lg bg-muted/50 px-4 py-3 text-left transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-600 font-semibold text-sm text-white">
              CD
            </span>
            <div className="min-w-0">
              <strong className="truncate font-semibold text-sm">
                自動部屬平台
              </strong>
              <p className="mt-0.5 truncate text-muted-foreground text-xs">
                連接部署流程、環境變數、Build hooks 與發佈狀態。
              </p>
            </div>
          </div>
          <Badge size="sm" variant="secondary">
            尚未連接
          </Badge>
        </button>
      </section>
    </div>
  );
}
