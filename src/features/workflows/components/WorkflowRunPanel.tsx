import {
  BoxIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  CircleXIcon,
  Clock3Icon,
  LockKeyholeIcon,
  PlayIcon,
} from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import type { WorkflowRun, WorkflowRunError, WorkflowRunStep } from "@/features/workflows/types"
import { getWorkflowNodeTitle } from "@/features/workflows/workflowUtils"
import type { WorkflowNode } from "@/features/workflows/types"

type WorkflowRunPanelProps = {
  nodes: WorkflowNode[]
  run: WorkflowRun | null
  polling: boolean
}

const STATUS_COPY = {
  queued: "等待中",
  pending: "等待中",
  running: "執行中",
  success: "成功",
  cached: "使用快取",
  failed: "失敗",
  cancelled: "已取消",
  skipped: "已略過",
} as const

export function WorkflowRunPanel({ nodes, polling, run }: WorkflowRunPanelProps) {
  if (!run) {
    return (
      <section className="grid place-items-center gap-3 px-7 py-16 text-center" aria-label="尚無執行紀錄">
        <span className="grid size-11 place-items-center rounded-2xl border border-border bg-muted"><PlayIcon aria-hidden="true" className="size-5" /></span>
        <div><h2 className="font-semibold text-sm">尚未執行</h2><p className="mt-1 max-w-56 text-muted-foreground text-xs leading-5">儲存 workflow 後，從上方選擇測試執行或正式執行。</p></div>
      </section>
    )
  }

  return (
    <section aria-labelledby="workflow-run-title" aria-live="polite" className="min-h-0 overflow-y-auto">
      <header className="grid gap-2 border-border border-b p-4">
        <div className="flex items-center justify-between gap-2">
          <div><p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.08em]">Run</p><h2 className="mt-1 font-semibold text-sm" id="workflow-run-title">執行紀錄</h2></div>
          <StatusBadge status={run.status} />
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px]">
          <dt className="text-muted-foreground">Run ID</dt><dd className="truncate font-mono">{run.runID}</dd>
          <dt className="text-muted-foreground">Target</dt><dd className="font-mono">{run.target}</dd>
          <dt className="text-muted-foreground">開始</dt><dd>{formatDate(run.startedAt)}</dd>
          <dt className="text-muted-foreground">完成</dt><dd>{formatDate(run.finishedAt)}</dd>
        </dl>
        {polling && <p className="flex items-center gap-1.5 text-info-foreground text-xs"><CircleDashedIcon aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" />正在讀取最新狀態...</p>}
      </header>

      <div className="grid gap-4 p-4">
        {run.error && <ErrorCard error={run.error} />}
        <section aria-labelledby="workflow-run-steps-title">
          <h3 className="mb-2 font-semibold text-xs" id="workflow-run-steps-title">Agent App invocation</h3>
          <ol className="grid gap-2">
            {run.steps.map((step, index) => {
              const node = nodes.find((item) => item.id === step.nodeID)
              return <RunStepCard index={index} key={`${step.nodeID}-${index}`} node={node} step={step} />
            })}
          </ol>
          {!run.steps.length && <p className="rounded-lg bg-muted px-3 py-4 text-center text-muted-foreground text-xs">Runner 尚未回傳 step。</p>}
        </section>

        {run.steps[0]?.execution && (
          <section className="grid gap-2" aria-labelledby="workflow-run-resolution-title">
            <h3 className="font-semibold text-xs" id="workflow-run-resolution-title">Resolved resources</h3>
            <div className="grid gap-1.5 rounded-xl border border-border bg-muted/40 p-3 text-xs">
              <p><span className="text-muted-foreground">Command：</span><strong>{run.steps[0].execution.command ?? "-"}</strong></p>
              <p><span className="text-muted-foreground">Agent：</span><strong>{run.steps[0].execution.agent ?? "-"}</strong></p>
              <p><span className="text-muted-foreground">Capabilities：</span><span className="text-muted-foreground">{run.steps[0].execution.capabilities.length ? run.steps[0].execution.capabilities.map(({ kind, name }) => `${kind}: ${name}`).join("、") : "未配置"}</span></p>
            </div>
          </section>
        )}

         {run.artifacts.length > 0 && (
          <section>
            <h3 className="mb-2 font-semibold text-xs">Artifacts</h3>
            <ul className="grid gap-1.5">{run.artifacts.map((artifact, index) => <li className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-xs" key={`${artifact.nodeID}-${artifact.sessionID}-${index}`}><BoxIcon aria-hidden="true" className="size-3.5" /><span className="min-w-0 flex-1 truncate">Session {artifact.sessionID}</span><code className="text-[10px] text-muted-foreground">{artifact.nodeID}</code></li>)}</ul>
          </section>
        )}
      </div>
    </section>
  )
}

function RunStepCard({ index, node, step }: { index: number; node?: WorkflowNode; step: WorkflowRunStep }) {
  const Icon = step.status === "success" ? CheckCircle2Icon : step.status === "failed" ? CircleXIcon : step.status === "cached" ? LockKeyholeIcon : Clock3Icon
  return (
    <li className={`rounded-xl border p-3 ${step.status === "cached" ? "border-warning/35 bg-warning/8" : step.status === "failed" ? "border-destructive/30 bg-destructive/8" : "border-border bg-background"}`}>
      <div className="flex items-start gap-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted font-mono text-[10px]">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2"><strong className="truncate text-xs">{node ? getWorkflowNodeTitle(node) : step.nodeID}</strong><StatusBadge status={step.status} /></div>
          <p className="mt-1 flex items-center gap-1 font-mono text-[10px] text-muted-foreground"><Icon aria-hidden="true" className="size-3" />{step.type}</p>
        </div>
      </div>
      {step.status === "cached" && <p className="mt-2 rounded-md bg-background/70 px-2 py-1.5 text-[11px] text-warning-foreground">未重新執行，重用 Run {step.cache?.sourceRunID ?? "未知"} 的成功輸出。</p>}
      {step.error && <div className="mt-2"><ErrorCard error={step.error} compact /></div>}
      {step.output !== undefined && <div className="mt-2"><ResultBlock title="Output" value={step.output} /></div>}
      {step.artifacts && step.artifacts.length > 0 && <p className="mt-2 text-[11px] text-muted-foreground">產出 {step.artifacts.length} 個 artifact</p>}
    </li>
  )
}

function StatusBadge({ status }: { status: keyof typeof STATUS_COPY }) {
  const variant = status === "success" ? "success" : status === "failed" ? "error" : status === "cached" ? "warning" : status === "running" ? "info" : "secondary"
  return <Badge size="sm" variant={variant}>{STATUS_COPY[status]}</Badge>
}

function ErrorCard({ compact = false, error }: { compact?: boolean; error: WorkflowRunError }) {
  const details = typeof error === "string" ? { message: error } : error
  return (
    <div className={`rounded-lg border border-destructive/30 bg-destructive/8 text-destructive-foreground ${compact ? "p-2 text-[11px]" : "p-3 text-xs"}`} role="alert">
      <strong className="block">{details.message}</strong>
      {typeof error !== "string" && details.code && <p className="mt-1 font-mono opacity-80">{details.code}</p>}
      {typeof error !== "string" && details.details !== undefined && <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[10px] opacity-80">{safeStringify(details.details)}</pre>}
    </div>
  )
}

function ResultBlock({ title, value }: { title: string; value: unknown }) {
  return <details className="rounded-lg border border-border bg-muted/40 p-2"><summary className="cursor-pointer font-medium text-[11px]">{title}</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] text-muted-foreground">{safeStringify(value)}</pre></details>
}

function safeStringify(value: unknown) {
  try { return JSON.stringify(value, null, 2) }
  catch { return String(value) }
}

function formatDate(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("zh-TW", { dateStyle: "short", timeStyle: "medium" }).format(date)
}
