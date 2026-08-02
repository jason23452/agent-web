import { BotIcon, CheckCircle2Icon, CircleAlertIcon, CommandIcon, PlugZapIcon, PlusIcon, SparklesIcon, UnlinkIcon, WrenchIcon } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import type { ResourceNodeData, WorkflowCapabilityKind, WorkflowEdge, WorkflowNode, WorkflowV1 } from "@/features/workflows/types"
import { capabilityTargetHandle, projectWorkflowRelationships } from "@/features/workflows/workflowUtils"

type WorkflowAgentAppPanelProps = {
  workflow: WorkflowV1
  onAddCapability: (agentNodeID: string, nodeID: string) => void
  onAddDelegation: (sourceAgentID: string, targetAgentID: string) => void
  onOpenPalette: () => void
  onRemoveEdge: (edgeID: string) => void
  onSelectNode: (nodeID: string) => void
  onSetCommandAgent: (agentNodeID: string) => void
}

const CAPABILITY_META = {
  skill: { label: "Skills", icon: SparklesIcon, nodeType: "resource.skill" },
  tool: { label: "Tools", icon: WrenchIcon, nodeType: "resource.tool" },
  mcp: { label: "MCP", icon: PlugZapIcon, nodeType: "resource.mcp" },
  plugin: { label: "Plugins", icon: BotIcon, nodeType: "resource.plugin" },
} as const satisfies Record<WorkflowCapabilityKind, { label: string; icon: typeof SparklesIcon; nodeType: WorkflowNode["type"] }>

type AgentResourceNode = WorkflowNode & { type: "resource.agent"; data: ResourceNodeData }

export function WorkflowAgentAppPanel({ onAddCapability, onAddDelegation, onOpenPalette, onRemoveEdge, onSelectNode, onSetCommandAgent, workflow }: WorkflowAgentAppPanelProps) {
  const projection = projectWorkflowRelationships(workflow)
  const resourceNodes = workflow.nodes.filter((node): node is WorkflowNode & { type: `resource.${string}`; data: ResourceNodeData } => node.type.startsWith("resource."))
  const command = resourceNodes.find((node) => node.type === "resource.command")
  const agents = resourceNodes.filter((node): node is AgentResourceNode => node.type === "resource.agent")
  const commandAgentEdge = command && workflow.edges.find((edge) => edge.kind === "capability" && edge.source === command.id && edge.targetHandle === "agent")
  const primaryAgent = agents.find((candidate) => candidate.id === commandAgentEdge?.target)
  const app = projection.agentApps.find((candidate) => candidate.agentNodeID === primaryAgent?.id)

  return (
    <section aria-label="Agent App 摘要" className="min-h-0 overflow-y-auto">
      <header className="border-border border-b p-4">
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.08em]">Dify-like layer</p>
        <h2 className="mt-1 font-semibold text-sm">Agent Apps</h2>
        <p className="mt-1 text-muted-foreground text-xs leading-5">Command 指定 primary Agent；其餘 Agent 透過 OpenCode-native task delegation 組成 DAG。</p>
      </header>
      <div className="grid gap-3 p-3">
        {!command && agents.length === 0 ? (
          <EmptyState onOpenPalette={onOpenPalette} />
        ) : (
          <article className="grid gap-3 rounded-xl border border-border bg-card p-3">
            <div className="flex items-start gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted"><BotIcon aria-hidden="true" className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-sm">{primaryAgent ? resourceName(primaryAgent) : "尚未指定 primary Agent"}</p>
                <button className="mt-1 flex max-w-full items-center gap-1 truncate text-left text-muted-foreground text-xs hover:text-foreground" disabled={!command} onClick={() => command && onSelectNode(command.id)} type="button">
                  <CommandIcon aria-hidden="true" className="size-3 shrink-0" />
                  <span className="truncate">{command ? resourceName(command) : "尚未建立 Command"}</span>
                </button>
              </div>
              <Badge size="sm" variant={app ? "success" : "warning"}>
                {app ? <><CheckCircle2Icon aria-hidden="true" /> Ready</> : <><CircleAlertIcon aria-hidden="true" /> Incomplete</>}
              </Badge>
            </div>

            {command && (
              <label className="grid gap-1.5 text-xs">
                <span className="font-medium text-muted-foreground">Agent App primary Agent</span>
                <select
                  aria-label="Agent App primary Agent"
                  className="workflow-select"
                  onChange={(event) => {
                    if (event.target.value) onSetCommandAgent(event.target.value)
                  }}
                  value={commandAgentEdge?.target ?? ""}
                >
                  <option value="">尚未指定</option>
                  {agents.map((candidate) => <option key={candidate.id} value={candidate.id}>{resourceName(candidate)}</option>)}
                </select>
                <span className="text-[11px] text-muted-foreground">primary Agent 的 mode 與 Command frontmatter 會由 graph 自動同步。</span>
              </label>
            )}

            {agents.length > 0 ? agents.map((agent) => (
              <AgentRelationshipCard
                agent={agent}
                agents={agents}
                edges={workflow.edges}
                isPrimary={agent.id === primaryAgent?.id}
                key={agent.id}
                onAddCapability={onAddCapability}
                onAddDelegation={onAddDelegation}
                onRemoveEdge={onRemoveEdge}
                onSelectNode={onSelectNode}
                resourceNodes={resourceNodes}
              />
            )) : (
              <p className="rounded-lg border border-warning/30 bg-warning/8 px-3 py-2 text-warning-foreground text-xs">請先從節點面板建立一個 Agent。</p>
            )}

            <Button onClick={onOpenPalette} size="sm" variant="outline"><PlusIcon aria-hidden="true" />新增或加入資源</Button>
            <p className="text-[11px] text-muted-foreground">V2 delegation 只會同步 OpenCode agent 的 permission.task，不會建立額外 runner 或 workflow step。</p>
          </article>
        )}
      </div>
    </section>
  )
}

function AgentRelationshipCard({ agent, agents, edges, isPrimary, onAddCapability, onAddDelegation, onRemoveEdge, onSelectNode, resourceNodes }: {
  agent: AgentResourceNode
  agents: AgentResourceNode[]
  edges: WorkflowEdge[]
  isPrimary: boolean
  onAddCapability: (agentNodeID: string, nodeID: string) => void
  onAddDelegation: (sourceAgentID: string, targetAgentID: string) => void
  onRemoveEdge: (edgeID: string) => void
  onSelectNode: (nodeID: string) => void
  resourceNodes: Array<WorkflowNode & { type: `resource.${string}`; data: ResourceNodeData }>
}) {
  const delegations = edges
    .filter((edge) => edge.kind === "delegation" && edge.source === agent.id)
    .flatMap((edge) => {
      const target = agents.find((candidate) => candidate.id === edge.target)
      return target ? [{ edge, node: target }] : []
    })
  const primaryID = edges.find((edge) => edge.kind === "capability" && edge.targetHandle === "agent" && edge.source !== agent.id)?.target
  const availableDelegates = agents.filter((candidate) => candidate.id !== agent.id && candidate.id !== primaryID && !delegations.some((item) => item.node.id === candidate.id))

  return (
    <section className="grid gap-2 rounded-lg border border-border/70 bg-muted/30 p-2.5">
      <div className="flex items-start gap-2">
        <button className="min-w-0 flex-1 truncate text-left font-semibold text-xs hover:underline" onClick={() => onSelectNode(agent.id)} type="button">{resourceName(agent)}</button>
        <Badge size="sm" variant={isPrimary ? "default" : "secondary"}>{isPrimary ? "Primary" : "Subagent"}</Badge>
      </div>
      <div className="grid gap-1.5">
        <span className="font-medium text-muted-foreground text-[11px]">Delegated Agents</span>
        {delegations.map(({ edge, node }) => (
          <div className="flex min-w-0 items-center gap-1.5" key={edge.id}>
            <button className="min-w-0 flex-1 truncate text-left text-xs hover:underline" onClick={() => onSelectNode(node.id)} type="button">{resourceName(node)}</button>
            <Button aria-label={`解除 ${resourceName(node)} delegation`} onClick={() => onRemoveEdge(edge.id)} size="icon-xs" variant="ghost"><UnlinkIcon aria-hidden="true" /></Button>
          </div>
        ))}
        {delegations.length === 0 && <span className="text-muted-foreground text-xs">未配置</span>}
        <select
          aria-label={`新增 ${resourceName(agent)} delegation`}
          className="workflow-select h-8"
          onChange={(event) => {
            if (event.target.value) onAddDelegation(agent.id, event.target.value)
          }}
          value=""
        >
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
            <select
              aria-label={`新增 ${meta.label} 到 ${resourceName(agent)}`}
              className="workflow-select h-8"
              onChange={(event) => {
                if (event.target.value) onAddCapability(agent.id, event.target.value)
              }}
              value=""
            >
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
    .filter((edge) => edge.kind === "capability" && edge.source === agent.id && edge.targetHandle === capabilityTargetHandle(nodeType))
    .flatMap((edge) => {
      const node = nodes.find((candidate) => candidate.id === edge.target && candidate.type === nodeType)
      return node ? [{ edge, node }] : []
    })
}

function resourceName(node: WorkflowNode & { data: ResourceNodeData }) {
  return node.data.name || node.type.replace("resource.", "")
}
