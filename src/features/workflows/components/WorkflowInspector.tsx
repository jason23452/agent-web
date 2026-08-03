import { useState, type ReactNode } from "react"
import { CopyIcon, Link2Icon, LockIcon, Trash2Icon, UnlinkIcon } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Switch } from "@/shared/components/ui/switch"
import { Textarea } from "@/shared/components/ui/textarea"
import type {
  ResourceNodeData,
  WorkflowCacheMetadataResult,
  WorkflowEdge,
  WorkflowNode,
  WorkflowRun,
  WorkflowScope,
  WorkflowTarget,
} from "@/features/workflows/types"
import {
  getEdgeLabel,
  getWorkflowNodeTitle,
  resolveConnectionKind,
  scopeLabel,
  WORKFLOW_NODE_META,
} from "@/features/workflows/workflowUtils"
import { WorkflowResourceConfigPanel } from "@/features/workflows/components/WorkflowResourceConfigPanels"

type WorkflowInspectorProps = {
  availableModels?: string[]
  edges: WorkflowEdge[]
  cacheMetadata: WorkflowCacheMetadataResult | null
  nodes: WorkflowNode[]
  run: WorkflowRun | null
  selectedEdge: WorkflowEdge | null
  selectedNode: WorkflowNode | null
  target: WorkflowTarget
  workflowScope: WorkflowScope
  onClearCache: (nodeID: string, target: WorkflowTarget) => Promise<void>
  onDeleteEdge: (edgeID: string) => void
  onDeleteNode: (nodeID: string) => void
  onDuplicateNode: (nodeID: string) => void
  onTargetChange: (target: WorkflowTarget) => void
  onUpdateEdge: (edge: WorkflowEdge) => void
  onUpdateNode: (node: WorkflowNode) => void
  protectedWorkflow: boolean
}

export function WorkflowInspector(props: WorkflowInspectorProps) {
  if (props.protectedWorkflow) {
    if (props.selectedNode?.type.startsWith("resource.")) {
      return <WorkflowResourceConfigPanel availableModels={props.availableModels} edges={props.edges} node={props.selectedNode} nodes={props.nodes} onClose={() => undefined} onUpdateNode={props.onUpdateNode} protectedWorkflow />
    }
    if (props.selectedNode || props.selectedEdge) {
      return <section className="grid gap-3 px-7 py-16 text-center" aria-label="預設 Workflow 鎖定資訊"><LockIcon className="mx-auto size-5 text-muted-foreground" /><h2 className="font-semibold text-sm">預設 Workflow 已鎖定</h2><p className="text-muted-foreground text-xs leading-5">只有 resource.agent 與 resource.command 的 Model / Variant 可以編輯。</p></section>
    }
  }
  if (props.selectedNode) return <NodeInspector key={props.selectedNode.id} node={props.selectedNode} {...props} />
  if (props.selectedEdge) return <EdgeInspector edge={props.selectedEdge} {...props} />

  return (
    <section className="grid place-items-center gap-3 px-7 py-16 text-center" aria-label="檢查器空白狀態">
      <span className="grid size-11 place-items-center rounded-2xl border border-border bg-muted"><Link2Icon aria-hidden="true" className="size-5" /></span>
      <div>
        <h2 className="font-semibold text-sm">選取節點或連線</h2>
        <p className="mt-1 max-w-56 text-muted-foreground text-xs leading-5">在畫布上選取 resource 或 capability relationship 後，可編輯設定與 scope。</p>
      </div>
    </section>
  )
}

function NodeInspector({
  edges,
  cacheMetadata,
  availableModels,
  nodes,
  node,
  run,
  target,
  workflowScope,
  onClearCache,
  onDeleteNode,
  onDuplicateNode,
  onTargetChange,
  onUpdateNode,
}: WorkflowInspectorProps & { node: WorkflowNode }) {
  const [clearing, setClearing] = useState(false)
  const cachedStep = run?.steps.find((step) => step.nodeID === node.id && step.status === "cached")
  const cache = cacheMetadata?.nodeID === node.id && cacheMetadata.target === target ? cacheMetadata.cache : null
  const inbound = edges
    .filter((edge) => edge.target === node.id && edge.kind === "binding")
    .map((edge) => ({ edge, source: nodes.find((item) => item.id === edge.source) }))
  const lockAllowed = node.type.startsWith("action.")
  const currentModelKey = node.type === "action.prompt" && node.data.model?.providerID && node.data.model.modelID
    ? `${node.data.model.providerID}/${node.data.model.modelID}`
    : ""

  async function clearCache() {
    setClearing(true)
    try {
      await onClearCache(node.id, target)
    } finally {
      setClearing(false)
    }
  }

  return (
    <section aria-labelledby="node-inspector-title" className="min-h-0 overflow-y-auto">
      <header className="border-border border-b p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.08em]">{WORKFLOW_NODE_META[node.type].category}</p>
            <h2 className="mt-1 truncate font-semibold text-sm" id="node-inspector-title">{getWorkflowNodeTitle(node)}</h2>
          </div>
          <div className="flex gap-1">
            <Button aria-label="複製節點" onClick={() => onDuplicateNode(node.id)} size="icon-sm" variant="ghost"><CopyIcon aria-hidden="true" /></Button>
            <Button aria-label="刪除節點" onClick={() => onDeleteNode(node.id)} size="icon-sm" variant="ghost"><Trash2Icon aria-hidden="true" /></Button>
          </div>
        </div>
      </header>

      <div className="grid gap-5 p-4">
        <InspectorGroup title="一般">
          <InspectorField label="Node ID">
            <Input
              aria-label="Node ID"
              defaultValue={node.id}
              key={node.id}
              onBlur={(event) => {
                const id = event.target.value.trim().replace(/[^A-Za-z0-9_-]/g, "").slice(0, 100)
                if (id && id !== node.id) onUpdateNode({ ...node, id })
              }}
            />
          </InspectorField>
          <InspectorField label="Node type"><code className="rounded-md bg-muted px-2 py-1.5 font-mono text-[11px]">{node.type}</code></InspectorField>
        </InspectorGroup>

        {node.type.startsWith("resource.") && (
          <ResourceInspector edges={edges} node={node} nodes={nodes} onUpdateNode={onUpdateNode} workflowScope={workflowScope} />
        )}

        {node.type === "trigger.manual" && (
          <InspectorGroup title="觸發器">
            <p className="text-muted-foreground text-xs leading-5">手動觸發器是 V1 workflow 的必要入口。執行時的 input 會從此節點進入流程。</p>
          </InspectorGroup>
        )}

        {node.type === "action.prompt" && (
          <InspectorGroup title="Prompt 設定">
            <InspectorField label="Prompt text"><Textarea aria-label="Prompt text" onChange={(event) => onUpdateNode({ ...node, data: { ...node.data, text: event.target.value } })} placeholder="描述要 OpenCode 完成的工作..." value={node.data.text} /></InspectorField>
            <SessionModeSelect node={node} onUpdateNode={onUpdateNode} />
            {availableModels?.length ? (
              <InspectorField label="Model（選填）">
                <select
                  aria-label="Model"
                  className="workflow-select"
                  onChange={(event) => {
                    const separator = event.target.value.indexOf("/")
                    const model = separator > 0
                      ? { providerID: event.target.value.slice(0, separator), modelID: event.target.value.slice(separator + 1) }
                      : undefined
                    onUpdateNode({ ...node, data: { ...node.data, model } })
                  }}
                  value={currentModelKey}
                >
                  <option value="">未指定</option>
                  {currentModelKey && !availableModels.includes(currentModelKey) && <option value={currentModelKey}>{currentModelKey}</option>}
                  {availableModels.map((model) => <option key={model} value={model}>{model}</option>)}
                </select>
              </InspectorField>
            ) : (
              <>
                <InspectorField label="Provider ID（選填）"><Input aria-label="Provider ID" onChange={(event) => onUpdateNode({ ...node, data: { ...node.data, model: { ...node.data.model, providerID: event.target.value } } })} value={node.data.model?.providerID ?? ""} /></InspectorField>
                <InspectorField label="Model ID（選填）"><Input aria-label="Model ID" onChange={(event) => onUpdateNode({ ...node, data: { ...node.data, model: { ...node.data.model, modelID: event.target.value } } })} value={node.data.model?.modelID ?? ""} /></InspectorField>
              </>
            )}
            <BindingSummary inbound={inbound} />
          </InspectorGroup>
        )}

        {node.type === "action.command" && (
          <InspectorGroup title="Command 設定">
            <InspectorField label="Arguments"><Input aria-label="Command arguments" onChange={(event) => onUpdateNode({ ...node, data: { ...node.data, arguments: event.target.value } })} placeholder="例如 --fix" value={node.data.arguments} /></InspectorField>
            <SessionModeSelect node={node} onUpdateNode={onUpdateNode} />
            <BindingSummary inbound={inbound} />
          </InspectorGroup>
        )}

        {node.type === "action.restart" && <p className="rounded-lg bg-muted px-3 py-2.5 text-muted-foreground text-xs">此動作只會重啟本次執行選定的 target runtime。</p>}

        {lockAllowed && <InspectorGroup title="Lock cache">
          <label className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2"><LockIcon aria-hidden="true" className="size-3.5" />鎖定此 node</span>
            <Switch
              aria-label="鎖定此 node"
              checked={Boolean(node.lock?.enabled)}
              disabled={!lockAllowed}
              onCheckedChange={(checked) => onUpdateNode({ ...node, lock: { enabled: checked, mode: "last-success" } })}
            />
          </label>
          {!lockAllowed && <p className="text-muted-foreground text-xs">只有可執行的 action node 能使用 last-success cache。</p>}
          {node.lock?.enabled && <p className="rounded-lg border border-warning/30 bg-warning/8 px-3 py-2 text-warning-foreground text-xs">Node data、inbound edge 或 target 改變後，last-success cache 可能已過期。</p>}
          {lockAllowed && (cache || cachedStep?.cache) ? (
            <div className="grid gap-1 rounded-lg border border-warning/30 bg-warning/8 p-3 text-xs">
              <strong className="text-warning-foreground">最近 cached output</strong>
              <span>Run：<code>{cache?.sourceRunID ?? cachedStep?.cache?.sourceRunID ?? run?.runID}</code></span>
              <span>Target：{target}</span>
              <span>時間：{formatDate(cache?.createdAt ?? cachedStep?.cache?.createdAt)}</span>
            </div>
          ) : lockAllowed ? <p className="rounded-lg bg-muted px-3 py-2.5 text-muted-foreground text-xs">尚無可重用輸出。鎖定後若 backend 也無 cache，執行會失敗。</p> : null}
          {lockAllowed && (
            <InspectorField label="Cache target">
              <select className="workflow-select" onChange={(event) => onTargetChange(event.target.value as WorkflowTarget)} value={target}>
                <option value="workflow-test">workflow-test</option><option value="main">main</option>
              </select>
            </InspectorField>
          )}
          {lockAllowed && <Button loading={clearing} onClick={() => void clearCache()} variant="destructive-outline">清除 {target} node cache</Button>}
        </InspectorGroup>}
      </div>
    </section>
  )
}

function ResourceInspector({
  edges,
  node,
  nodes,
  onUpdateNode,
  workflowScope,
}: {
  edges: WorkflowEdge[]
  node: WorkflowNode
  nodes: WorkflowNode[]
  onUpdateNode: (node: WorkflowNode) => void
  workflowScope: WorkflowScope
}) {
  const data = node.data as ResourceNodeData
  const [configDraft, setConfigDraft] = useState(() => JSON.stringify(data.config ?? {}, null, 2))
  const [configError, setConfigError] = useState("")
  return (
    <InspectorGroup title="Resource">
      <InspectorField label="模式">
        <select
          className="workflow-select"
          onChange={(event) => {
            const mode = event.target.value as ResourceNodeData["mode"]
            const nextData: ResourceNodeData = mode === "reference"
              ? { mode, name: data.name, scope: data.scope }
              : node.type === "resource.mcp"
                ? { mode, name: data.name, scope: data.scope, config: data.config ?? { type: "remote", url: "https://example.com/mcp", enabled: false } }
                : { mode, name: data.name, scope: data.scope, content: data.content ?? "" }
            setConfigDraft(JSON.stringify(nextData.config ?? {}, null, 2))
            onUpdateNode({ ...node, data: nextData } as WorkflowNode)
          }}
          value={data.mode}
        >
          <option value="reference">Reference（不覆寫）</option>
          <option value="managed">Managed（發布時同步）</option>
        </select>
      </InspectorField>
      <InspectorField label="Resource name"><Input aria-label="Resource name" onChange={(event) => onUpdateNode({ ...node, data: { ...data, name: event.target.value } } as WorkflowNode)} value={data.name} /></InspectorField>
      <InspectorField label="範圍">
        <select className="workflow-select" onChange={(event) => onUpdateNode({ ...node, data: { ...data, scope: event.target.value as ResourceNodeData["scope"] } } as WorkflowNode)} value={data.scope}>
          {workflowScope === "project" && <option value="project">專案</option>}<option value="global">全域</option>
        </select>
      </InspectorField>
      {data.mode === "reference" && (
        <div className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs">
          <span>Reference 驗證</span>
          <Badge variant="secondary">發布時驗證</Badge>
        </div>
      )}
      {data.mode === "managed" && node.type === "resource.mcp" && (
        <InspectorField description="Secret 請使用 {env:VARIABLE_NAME}，不要填入明文。" label="MCP config JSON">
          <Textarea
            aria-invalid={Boolean(configError)}
            aria-label="MCP config JSON"
            className="font-mono text-xs"
            onBlur={() => {
              try {
                const config = JSON.parse(configDraft) as Record<string, unknown>
                setConfigError("")
                onUpdateNode({ ...node, data: { ...data, config } } as WorkflowNode)
              } catch {
                setConfigError("JSON 格式無效，尚未套用。")
              }
            }}
            onChange={(event) => setConfigDraft(event.target.value)}
            value={configDraft}
          />
          {configError && <p className="text-destructive-foreground text-xs" role="alert">{configError}</p>}
        </InspectorField>
      )}
      {data.mode === "managed" && node.type !== "resource.mcp" && (
        <InspectorField description="內容只保存於 workflow JSON，直到明確發布才會同步到 OpenCode。" label="Managed content">
          <Textarea aria-label="Managed resource content" className="min-h-44 font-mono text-xs" onChange={(event) => onUpdateNode({ ...node, data: { ...data, content: event.target.value } } as WorkflowNode)} value={data.content ?? ""} />
        </InspectorField>
      )}
      <CapabilitySummary edges={edges} node={node} nodes={nodes} />
      {data.scope === "global" && <p className="rounded-lg border border-warning/30 bg-warning/8 px-3 py-2 text-warning-foreground text-xs">全域資源發布後會影響所有 Project。</p>}
      <p className="text-muted-foreground text-[11px]">目前範圍：{scopeLabel(data.scope)}</p>
    </InspectorGroup>
  )
}

function CapabilitySummary({ edges, node, nodes }: { edges: WorkflowEdge[]; node: WorkflowNode; nodes: WorkflowNode[] }) {
  if (!node.type.startsWith("resource.")) return null
  const related = edges
    .filter((edge) => (edge.kind === "capability" || edge.kind === "delegation") && (edge.source === node.id || edge.target === node.id))
    .map((edge) => {
      const otherID = edge.source === node.id ? edge.target : edge.source
      const other = nodes.find((candidate) => candidate.id === otherID)
      return { edge, other }
    })
  return (
    <InspectorGroup title="Agent relationships">
      {related.length ? (
        <ul className="grid gap-1.5">
          {related.map(({ edge, other }) => <li className="flex items-center justify-between gap-2 rounded-md bg-muted px-2.5 py-2 text-xs" key={edge.id}><span className="text-muted-foreground">{edge.kind === "delegation" ? "委派" : edge.source === node.id ? "使用" : "被使用"}</span><strong className="truncate">{other ? getWorkflowNodeTitle(other) : edge.source === node.id ? edge.target : edge.source}</strong></li>)}
        </ul>
      ) : <p className="rounded-lg bg-muted px-3 py-2 text-muted-foreground text-xs">尚未建立 relationship。</p>}
      <p className="text-[11px] text-muted-foreground">Capability 是 declarative dependency；delegation 會投影為 OpenCode permission.task，兩者都不代表 runtime hard isolation。</p>
    </InspectorGroup>
  )
}

function SessionModeSelect({ node, onUpdateNode }: { node: Extract<WorkflowNode, { type: "action.prompt" | "action.command" }>; onUpdateNode: (node: WorkflowNode) => void }) {
  return (
    <InspectorField label="Session mode">
      <select className="workflow-select" onChange={(event) => {
        const sessionMode = event.target.value as typeof node.data.sessionMode
        if (node.type === "action.prompt") onUpdateNode({ ...node, data: { ...node.data, sessionMode } })
        else onUpdateNode({ ...node, data: { ...node.data, sessionMode } })
      }} value={node.data.sessionMode}>
        <option value="reuse-or-create">重用或建立</option><option value="create">每次建立</option>
      </select>
    </InspectorField>
  )
}

function BindingSummary({ inbound }: { inbound: Array<{ edge: WorkflowEdge; source?: WorkflowNode }> }) {
  return (
    <InspectorField label="Inbound bindings">
      {inbound.length ? (
        <ul className="grid gap-1.5">{inbound.map(({ edge, source }) => <li className="flex items-center justify-between rounded-md bg-muted px-2.5 py-2 text-xs" key={edge.id}><span>{edge.targetHandle}</span><strong className="truncate">{source ? getWorkflowNodeTitle(source) : edge.source}</strong></li>)}</ul>
      ) : <p className="rounded-lg bg-muted px-3 py-2 text-muted-foreground text-xs">尚未連接 resource binding。</p>}
    </InspectorField>
  )
}

function EdgeInspector({ edge, nodes, onDeleteEdge, onUpdateEdge }: WorkflowInspectorProps & { edge: WorkflowEdge }) {
  const source = nodes.find((node) => node.id === edge.source)
  const target = nodes.find((node) => node.id === edge.target)
  const expectedKind = resolveConnectionKind(source, target, edge.sourceHandle, edge.targetHandle)
  const valid = expectedKind === edge.kind
  return (
    <section aria-labelledby="edge-inspector-title" className="min-h-0 overflow-y-auto">
      <header className="flex items-start justify-between gap-3 border-border border-b p-4">
        <div><p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.08em]">Edge</p><h2 className="mt-1 font-semibold text-sm" id="edge-inspector-title">{getEdgeLabel(edge.kind)}連線</h2></div>
        <Button aria-label="刪除連線" onClick={() => onDeleteEdge(edge.id)} size="icon-sm" variant="ghost"><UnlinkIcon aria-hidden="true" /></Button>
      </header>
      <div className="grid gap-5 p-4">
        <InspectorGroup title="連線設定">
          <InspectorField label="Edge ID"><code className="workflow-code-value">{edge.id}</code></InspectorField>
          <InspectorField label="Kind">
            <select className="workflow-select" onChange={(event) => onUpdateEdge({ ...edge, kind: event.target.value as WorkflowEdge["kind"] })} value={edge.kind}>
               <option value="capability">capability</option>
               <option value="delegation">delegation</option>
            </select>
          </InspectorField>
          <InspectorField label="Source"><code className="workflow-code-value">{source ? getWorkflowNodeTitle(source) : edge.source}</code></InspectorField>
          <InspectorField label="Source handle"><code className="workflow-code-value">{edge.sourceHandle ?? "-"}</code></InspectorField>
          <InspectorField label="Target"><code className="workflow-code-value">{target ? getWorkflowNodeTitle(target) : edge.target}</code></InspectorField>
          <InspectorField label="Target handle"><code className="workflow-code-value">{edge.targetHandle ?? "-"}</code></InspectorField>
          <div className={`rounded-lg border px-3 py-2.5 text-xs ${valid ? "border-success/30 bg-success/8 text-success-foreground" : "border-destructive/30 bg-destructive/8 text-destructive-foreground"}`}>
            {valid ? "連線語意與 handle 相容。" : `連線語意無效，依 handle 應為 ${expectedKind ?? "不允許連線"}。`}
          </div>
        </InspectorGroup>
      </div>
    </section>
  )
}

function InspectorGroup({ children, title }: { children: ReactNode; title: string }) {
  return <fieldset className="grid gap-3"><legend className="mb-1 font-semibold text-xs">{title}</legend>{children}</fieldset>
}

function InspectorField({ children, description, label }: { children: ReactNode; description?: string; label: string }) {
  return <label className="grid gap-1.5 text-xs"><span className="font-medium text-muted-foreground">{label}</span>{children}{description && <span className="text-[11px] text-muted-foreground leading-4">{description}</span>}</label>
}

function formatDate(value?: string) {
  if (!value) return "未知"
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("zh-TW", { dateStyle: "short", timeStyle: "medium" }).format(date)
}
