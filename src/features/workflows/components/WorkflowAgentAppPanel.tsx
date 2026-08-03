import { BotIcon, CheckCircle2Icon, CircleAlertIcon, CommandIcon, PlugZapIcon, PlusIcon, SparklesIcon, UnlinkIcon, WrenchIcon } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import type { ResourceNodeData, WorkflowCapabilityKind, WorkflowEdge, WorkflowNode, WorkflowV1 } from "@/features/workflows/types"
import { projectWorkflowRelationships, resolveWorkflowAgentRoles } from "@/features/workflows/workflowUtils"

type WorkflowAgentAppPanelProps = {
  workflow: WorkflowV1
  onAddCapability: (agentNodeID: string, nodeID: string) => void
  onAddPrimaryLink: (sourceAgentID: string, targetAgentID: string) => void
  onAddDelegation: (sourceAgentID: string, targetAgentID: string) => void
  onOpenPalette: () => void
  onRemoveEdge: (edgeID: string) => void
  onSelectNode: (nodeID: string) => void
  onSetCommandAgent: (agentNodeID: string, enabled: boolean) => void
  protectedWorkflow: boolean
}

const CAPABILITY_META = {
  skill: { label: "Skills", icon: SparklesIcon, nodeType: "resource.skill" },
  tool: { label: "Tools", icon: WrenchIcon, nodeType: "resource.tool" },
  mcp: { label: "MCP", icon: PlugZapIcon, nodeType: "resource.mcp" },
  plugin: { label: "Plugins", icon: BotIcon, nodeType: "resource.plugin" },
} as const satisfies Record<WorkflowCapabilityKind, { label: string; icon: typeof SparklesIcon; nodeType: WorkflowNode["type"] }>

type AgentResourceNode = WorkflowNode & { type: "resource.agent"; data: ResourceNodeData }

export function WorkflowAgentAppPanel({ onAddCapability, onAddPrimaryLink, onAddDelegation, onOpenPalette, onRemoveEdge, onSelectNode, onSetCommandAgent, protectedWorkflow, workflow }: WorkflowAgentAppPanelProps) {
  const projection = projectWorkflowRelationships(workflow)
  const roles = resolveWorkflowAgentRoles(workflow)
  const resourceNodes = workflow.nodes.filter((node): node is WorkflowNode & { type: `resource.${string}`; data: ResourceNodeData } => node.type.startsWith("resource."))
  const command = resourceNodes.find((node) => node.type === "resource.command")
  const agents = resourceNodes.filter((node): node is AgentResourceNode => node.type === "resource.agent")
  const commandAgentEdges = command ? workflow.edges.filter((edge) => edge.kind === "capability" && edge.source === command.id && edge.targetHandle === "agent" && agents.some((agent) => agent.id === edge.target)) : []
  const primaryAgent = agents.find((candidate) => roles.entryPrimaryIDs.has(candidate.id))

  return (
    <section aria-label="Agent App 摘要" className="min-h-0 overflow-y-auto">
      <header className="border-border border-b p-4">
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.08em]">Dify-like layer</p>
        <h2 className="mt-1 font-semibold text-sm">Agent Apps</h2>
        <p className="mt-1 text-muted-foreground text-xs leading-5">{protectedWorkflow ? "預設 Workflow 可以編輯 Agent App graph，但不能刪除整個 Workflow。" : "Command 可以連接多個 primary；primary link 與 delegation 共同組成 Agent DAG。"}</p>
      </header>
      <div className="grid gap-3 p-3">
        {!command && agents.length === 0 ? (
          <EmptyState onOpenPalette={onOpenPalette} />
        ) : (
          <article className="grid gap-3 rounded-xl border border-border bg-card p-3">
            <div className="flex items-start gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted"><BotIcon aria-hidden="true" className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-sm">{primaryAgent ? resourceName(primaryAgent) : "尚未指定 entry primary Agent"}</p>
                <button className="mt-1 flex max-w-full items-center gap-1 truncate text-left text-muted-foreground text-xs hover:text-foreground" disabled={!command} onClick={() => command && onSelectNode(command.id)} type="button">
                  <CommandIcon aria-hidden="true" className="size-3 shrink-0" />
                  <span className="truncate">{command ? resourceName(command) : "尚未建立 Command"}</span>
                </button>
              </div>
              <Badge size="sm" variant={projection.agentApps.length > 0 ? "success" : "warning"}>
                {projection.agentApps.length > 0 ? <><CheckCircle2Icon aria-hidden="true" /> {projection.agentApps.length} Entrypoint</> : <><CircleAlertIcon aria-hidden="true" /> Incomplete</>}
              </Badge>
            </div>

            {command && (
              <fieldset className="grid gap-1.5 text-xs">
                <legend className="font-medium text-muted-foreground">Agent App entry primary Agents</legend>
                <div className="grid gap-1.5 rounded-lg border border-border/70 bg-muted/30 p-2.5">
                  {agents.map((candidate) => {
                    const checked = commandAgentEdges.some((edge) => edge.target === candidate.id)
                    return (
                      <label className="flex min-w-0 items-center gap-2" key={candidate.id}>
                        <input aria-label={`${checked ? "移除" : "加入"} ${resourceName(candidate)} entry primary`} checked={checked} disabled={!checked && roles.subagentIDs.has(candidate.id)} onChange={(event) => onSetCommandAgent(candidate.id, event.target.checked)} title={!checked && roles.subagentIDs.has(candidate.id) ? "請先解除這個 Agent 的 delegation，才能設為 primary" : undefined} type="checkbox" />
                        <span className="min-w-0 flex-1 truncate">{resourceName(candidate)}</span>
                        <Badge size="sm" variant={checked ? "default" : "secondary"}>Primary</Badge>
                      </label>
                    )
                  })}
                </div>
                <span className="text-[11px] text-muted-foreground">Command 可以連接多個 entry primary；V3 multi-primary 目前只能儲存與匯入。</span>
              </fieldset>
            )}

            {agents.length > 0 ? agents.map((agent) => (
              <AgentRelationshipCard
                agent={agent}
                agents={agents}
                edges={workflow.edges}
                key={agent.id}
                onAddCapability={onAddCapability}
                onAddPrimaryLink={onAddPrimaryLink}
                onAddDelegation={onAddDelegation}
                onRemoveEdge={onRemoveEdge}
                onSelectNode={onSelectNode}
                resourceNodes={resourceNodes}
                workflow={workflow}
              />
            )) : (
              <p className="rounded-lg border border-warning/30 bg-warning/8 px-3 py-2 text-warning-foreground text-xs">請先從節點面板建立一個 Agent。</p>
            )}

            <Button onClick={onOpenPalette} size="sm" variant="outline"><PlusIcon aria-hidden="true" />新增或加入資源</Button>
            <p className="text-[11px] text-muted-foreground">黃色只代表 Agent-to-Agent；綠色代表 capability resource 連到 Agent input。每個 Agent 可以接多個 Tool、Plugin、Skill 或 MCP。</p>
          </article>
        )}
      </div>
    </section>
  )
}

function AgentRelationshipCard({ agent, agents, edges, onAddCapability, onAddPrimaryLink, onAddDelegation, onRemoveEdge, onSelectNode, resourceNodes, workflow }: {
  agent: AgentResourceNode
  agents: AgentResourceNode[]
  edges: WorkflowEdge[]
  onAddCapability: (agentNodeID: string, nodeID: string) => void
  onAddPrimaryLink: (sourceAgentID: string, targetAgentID: string) => void
  onAddDelegation: (sourceAgentID: string, targetAgentID: string) => void
  onRemoveEdge: (edgeID: string) => void
  onSelectNode: (nodeID: string) => void
  resourceNodes: Array<WorkflowNode & { type: `resource.${string}`; data: ResourceNodeData }>
  workflow: WorkflowV1
}) {
  const roles = resolveWorkflowAgentRoles(workflow)
  const role = roles.primaryIDs.has(agent.id) ? "primary" : roles.subagentIDs.has(agent.id) ? "subagent" : "unresolved"
  const isEntryPrimary = roles.entryPrimaryIDs.has(agent.id)
  const delegations = edges
    .filter((edge) => edge.kind === "delegation" && edge.source === agent.id)
    .flatMap((edge) => {
      const target = agents.find((candidate) => candidate.id === edge.target)
      return target ? [{ edge, node: target }] : []
    })
  const primaryLinks = edges
    .filter((edge) => edge.kind === "primary-link" && edge.source === agent.id)
    .flatMap((edge) => {
      const target = agents.find((candidate) => candidate.id === edge.target)
      return target ? [{ edge, node: target }] : []
    })
  const availablePrimaryLinks = role === "primary"
    ? agents.filter((candidate) => !roles.subagentIDs.has(candidate.id) && candidate.id !== agent.id && !primaryLinks.some((item) => item.node.id === candidate.id))
    : []
  const availableDelegates = role === "primary" || role === "subagent"
    ? agents.filter((candidate) => candidate.id !== agent.id && !roles.primaryIDs.has(candidate.id) && !delegations.some((item) => item.node.id === candidate.id))
    : []

  return (
    <section className="grid gap-2 rounded-lg border border-border/70 bg-muted/30 p-2.5">
      <div className="flex items-start gap-2">
        <button className="min-w-0 flex-1 truncate text-left font-semibold text-xs hover:underline" onClick={() => onSelectNode(agent.id)} type="button">{resourceName(agent)}</button>
        <Badge size="sm" variant={role === "primary" ? "default" : "secondary"}>{role === "primary" ? (isEntryPrimary ? "Entry Primary" : "Primary") : role === "subagent" ? "Subagent" : "未分類"}</Badge>
      </div>
      {agent.data.mode === "reference" && (
        <p className="rounded-md border border-warning/30 bg-warning/8 px-2.5 py-2 text-warning-foreground text-[11px] leading-5">
          Reference Agent 只能被 Workflow 使用；不能作為 delegation parent。請使用 managed coordinator 管理 permission.task。
        </p>
      )}

      {role === "primary" && (
        <div className="grid gap-1.5">
          <span className="font-medium text-muted-foreground text-[11px]">Primary Agents</span>
          {primaryLinks.map(({ edge, node }) => (
            <div className="flex min-w-0 items-center gap-1.5" key={edge.id}>
              <button className="min-w-0 flex-1 truncate text-left text-xs hover:underline" onClick={() => onSelectNode(node.id)} type="button">{resourceName(node)}</button>
              <Button aria-label={`解除 ${resourceName(node)} primary link`} onClick={() => onRemoveEdge(edge.id)} size="icon-xs" variant="ghost"><UnlinkIcon aria-hidden="true" /></Button>
            </div>
          ))}
          <select aria-label={`新增 ${resourceName(agent)} primary link`} className="workflow-select h-8" onChange={(event) => { if (event.target.value) onAddPrimaryLink(agent.id, event.target.value) }} value="">
            <option value="">新增 primary Agent...</option>
            {availablePrimaryLinks.map((candidate) => <option key={candidate.id} value={candidate.id}>{resourceName(candidate)}</option>)}
          </select>
        </div>
      )}

      <div className="grid gap-1.5">
        <span className="font-medium text-muted-foreground text-[11px]">Delegated Agents</span>
        {delegations.map(({ edge, node }) => (
          <div className="flex min-w-0 items-center gap-1.5" key={edge.id}>
            <button className="min-w-0 flex-1 truncate text-left text-xs hover:underline" onClick={() => onSelectNode(node.id)} type="button">{resourceName(node)}</button>
            <Button aria-label={`解除 ${resourceName(node)} delegation`} onClick={() => onRemoveEdge(edge.id)} size="icon-xs" variant="ghost"><UnlinkIcon aria-hidden="true" /></Button>
          </div>
        ))}
        {delegations.length === 0 && <span className="text-muted-foreground text-xs">未配置</span>}
        <select aria-label={`新增 ${resourceName(agent)} delegation`} className="workflow-select h-8" disabled={role === "unresolved" || agent.data.mode === "reference"} onChange={(event) => { if (event.target.value) onAddDelegation(agent.id, event.target.value) }} value="">
          <option value="">新增 delegated Agent...</option>
          {availableDelegates.map((candidate) => <option key={candidate.id} value={candidate.id}>{resourceName(candidate)}</option>)}
        </select>
      </div>

      {(Object.entries(CAPABILITY_META) as Array<[WorkflowCapabilityKind, (typeof CAPABILITY_META)[WorkflowCapabilityKind]]>).map(([kind, meta]) => {
        const Icon = meta.icon
        const connected = capabilityNodesFor(agent, edges, resourceNodes, meta.nodeType)
        const available = resourceNodes.filter((node) => node.type === meta.nodeType && !connected.some((item) => item.node.id === node.id))
        return (
          <div className="grid gap-2 rounded-lg bg-background/70 px-2.5 py-2" key={kind}>
            <div className="flex items-start gap-2">
              <Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <strong className="text-xs">{meta.label}</strong>
                {connected.length === 0 ? <span className="ml-2 text-muted-foreground text-xs">未配置</span> : (
                  <div className="mt-1 grid gap-1">
                    {connected.map(({ edge, node }) => (
                      <div className="flex min-w-0 items-center gap-1.5" key={edge.id}>
                        <button className="min-w-0 flex-1 truncate text-left text-xs hover:underline" onClick={() => onSelectNode(node.id)} type="button">{resourceName(node)}</button>
                        <Button aria-label={`解除 ${resourceName(node)} capability`} onClick={() => onRemoveEdge(edge.id)} size="icon-xs" variant="ghost"><UnlinkIcon aria-hidden="true" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <select aria-label={`新增 ${meta.label} 到 ${resourceName(agent)}`} className="workflow-select h-8" onChange={(event) => { if (event.target.value) onAddCapability(agent.id, event.target.value) }} value="">
              <option value="">新增 {meta.label}...</option>
              {available.map((node) => <option key={node.id} value={node.id}>{resourceName(node)}</option>)}
            </select>
          </div>
        )
      })}
    </section>
  )
}

function EmptyState({ onOpenPalette }: { onOpenPalette: () => void }) {
  return (
    <div className="grid gap-3 rounded-xl border border-dashed border-border px-4 py-8 text-center">
      <CircleAlertIcon aria-hidden="true" className="mx-auto size-5 text-muted-foreground" />
      <div><p className="font-medium text-sm">尚未建立 Agent App</p><p className="mt-1 text-muted-foreground text-xs leading-5">從節點面板建立 Command 與 Agent，不需要先編輯 JSON。</p></div>
      <Button onClick={onOpenPalette} size="sm" variant="outline"><PlusIcon aria-hidden="true" />開啟節點面板</Button>
    </div>
  )
}

function capabilityNodesFor(
  agent: WorkflowNode,
  edges: WorkflowEdge[],
  nodes: Array<WorkflowNode & { type: `resource.${string}`; data: ResourceNodeData }>,
  nodeType: WorkflowNode["type"],
) {
  return edges
    .filter((edge) => edge.kind === "capability" && (
      edge.target === agent.id && edge.targetHandle === "capability"
      || edge.source === agent.id && ["skill", "tool", "mcp", "plugin"].includes(edge.targetHandle ?? "")
    ))
    .flatMap((edge) => {
      const node = nodes.find((candidate) => candidate.id === (edge.target === agent.id ? edge.source : edge.target) && candidate.type === nodeType)
      return node ? [{ edge, node }] : []
    })
}

function resourceName(node: WorkflowNode & { data: ResourceNodeData }) {
  return node.data.name || node.type.replace("resource.", "")
}
