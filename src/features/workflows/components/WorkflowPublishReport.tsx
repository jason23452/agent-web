import { CheckCircle2Icon, CircleXIcon, RefreshCwIcon, ShieldCheckIcon } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/shared/components/ui/dialog"
import type { WorkflowPublishReport as PublishReport } from "@/features/workflows/types"
import { issueMessage } from "@/features/workflows/workflowUtils"

export function WorkflowPublishReport({ onOpenChange, open, report }: { onOpenChange: (open: boolean) => void; open: boolean; report: PublishReport | null }) {
  if (!report) return null
  const verifiedGroups = (["agents", "commands", "tools", "skills", "plugins", "mcp"] as const)
    .map((kind) => [kind, report.verified[kind]] as const)
    .filter(([, values]) => values.length > 0)
  const restartStatus = report.restart.status ?? (report.restart.requested ? "waiting" : "未要求")
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className="max-w-2xl" closeProps={{ "aria-label": "關閉發布報告" }}>
        <DialogHeader>
          <div className="flex items-start gap-3 pr-8">
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${report.published ? "bg-success/10 text-success-foreground" : "bg-destructive/10 text-destructive-foreground"}`}>{report.published ? <CheckCircle2Icon aria-hidden="true" className="size-5" /> : <CircleXIcon aria-hidden="true" className="size-5" />}</span>
            <div><DialogTitle>{report.published ? "發布完成" : "發布失敗"}</DialogTitle><DialogDescription className="mt-1">Workflow {report.workflowID} · {report.target}</DialogDescription></div>
          </div>
        </DialogHeader>
        <DialogPanel className="grid gap-5">
          <section className="grid gap-2 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 font-semibold text-sm"><RefreshCwIcon aria-hidden="true" className="size-4" />Runtime restart</h3><Badge variant={report.restart.status === "ready" ? "success" : report.restart.status === "failed" ? "error" : "info"}>{restartStatus}</Badge></div>
            <p className="text-muted-foreground text-xs">{report.restart.requested ? "已要求 target-scoped restart 並等待驗證。" : "本次未要求 restart。"}</p>
            {report.restart.operation?.error && <p className="text-destructive-foreground text-xs" role="alert">{report.restart.operation.error}</p>}
          </section>

           <section>
             <h3 className="mb-2 flex items-center gap-2 font-semibold text-sm"><ShieldCheckIcon aria-hidden="true" className="size-4" />Runtime verification</h3>
            {report.verified.deferred ? <p className="rounded-lg bg-info/8 px-3 py-3 text-info-foreground text-xs">Runtime 驗證已延後。</p> : verifiedGroups.length ? <div className="grid gap-2">{verifiedGroups.map(([kind, values]) => <div className="grid grid-cols-[88px_1fr] gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs" key={kind}><strong className="capitalize">{kind}</strong><span className="break-words text-muted-foreground">{values.join(", ")}</span></div>)}</div> : <p className="rounded-lg bg-muted px-3 py-3 text-muted-foreground text-xs">報告未列出已驗證資源。</p>}
             {report.verified.missing.length > 0 && <ul className="mt-2 grid gap-1 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-destructive-foreground text-xs">{report.verified.missing.map((item) => <li key={`${item.type}-${item.name}`}>{item.type}：{item.name}</li>)}</ul>}
             {report.verified.agentApps.length > 0 && <div className="mt-3 grid gap-2"><h4 className="font-medium text-xs">Agent App relationships</h4>{report.verified.agentApps.map((app) => <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs" key={app.id}><strong>{app.command} → {app.agent}</strong><p className="mt-1 text-muted-foreground">{Object.entries(app.capabilities).flatMap(([kind, names]) => names.length ? [`${kind}: ${names.join(", ")}`] : []).join(" · ") || "未配置 capabilities"}</p></div>)}</div>}
           </section>

          {report.updates.length > 0 && (
            <section><h3 className="mb-2 font-semibold text-sm">Resource sync</h3><div className="overflow-hidden rounded-xl border border-border"><table className="w-full text-left text-xs"><thead className="bg-muted/70 text-muted-foreground"><tr><th className="px-3 py-2 font-medium">類型</th><th className="px-3 py-2 font-medium">名稱</th><th className="px-3 py-2 font-medium">狀態</th></tr></thead><tbody>{report.updates.map((update, index) => <tr className="border-border border-t" key={`${update.resourceType}-${update.resourceName}-${index}`}><td className="px-3 py-2">{update.resourceType}</td><td className="px-3 py-2"><span className="block">{update.resourceName}</span>{update.path && <code className="text-[10px] text-muted-foreground">{update.path}</code>}</td><td className="px-3 py-2"><Badge variant="success">{update.operation}</Badge></td></tr>)}</tbody></table></div></section>
          )}

          {report.warnings.length > 0 && <section className="rounded-xl border border-warning/30 bg-warning/8 p-4"><h3 className="font-semibold text-sm text-warning-foreground">提醒</h3><ul className="mt-2 grid gap-1 text-warning-foreground text-xs">{report.warnings.map((warning, index) => <li key={`${issueMessage(warning)}-${index}`}>{issueMessage(warning)}</li>)}</ul></section>}
        </DialogPanel>
        <DialogFooter><DialogClose render={<Button variant="outline" />}>關閉報告</DialogClose></DialogFooter>
      </DialogPopup>
    </Dialog>
  )
}
