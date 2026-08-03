import { Handle, Position, type Node, type NodeProps } from "@xyflow/react"
import {
  BotIcon,
  BoxIcon,
  BracesIcon,
  CommandIcon,
  CopyIcon,
  FlagIcon,
  GitBranchIcon,
  MessageSquareTextIcon,
  PlugZapIcon,
  RotateCwIcon,
  SparklesIcon,
  Trash2Icon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import type { WorkflowNode } from "@/features/workflows/types"
import { getWorkflowNodeSummary, getWorkflowNodeTitle, WORKFLOW_NODE_META } from "@/features/workflows/workflowUtils"

export type WorkflowCanvasNodeData = Record<string, unknown> & {
  workflowNode: WorkflowNode
  currentAgentID: string | null
  onDelete: (nodeID: string) => void
  onDuplicate: (nodeID: string) => void
  onLockToggle: (nodeID: string) => void
}

export type WorkflowCanvasNode = Node<WorkflowCanvasNodeData, "workflow-node">

const TYPE_ICONS = {
  "trigger.manual": FlagIcon,
  "trigger.schedule": ZapIcon,
  "trigger.webhook": ZapIcon,
  "resource.agent": BotIcon,
  "resource.command": CommandIcon,
  "resource.skill": SparklesIcon,
  "resource.tool": WrenchIcon,
  "resource.mcp": PlugZapIcon,
  "resource.plugin": BoxIcon,
  "action.prompt": MessageSquareTextIcon,
  "action.command": BracesIcon,
  "action.restart": RotateCwIcon,
  "action.approval": FlagIcon,
  "action.shell": CommandIcon,
  "flow.condition": GitBranchIcon,
  "flow.merge": GitBranchIcon,
} as const

const CAPABILITY_TARGETS: Partial<Record<WorkflowNode["type"], string>> = {
  "resource.agent": "agent",
  "resource.skill": "skill",
  "resource.tool": "tool",
  "resource.mcp": "mcp",
  "resource.plugin": "plugin",
}

export function WorkflowNodeCard({ data, selected }: NodeProps<WorkflowCanvasNode>) {
  const node = data.workflowNode
  const Icon = TYPE_ICONS[node.type]
  const isResource = node.type.startsWith("resource.")
  const isCurrentAgent = node.type === "resource.agent" && node.id === data.currentAgentID
  const capabilitySourceClass = node.type === "resource.command"
    ? "workflow-handle--entry"
    : isCurrentAgent
      ? "workflow-handle--current-capability"
      : "workflow-handle--capability-muted"

  return (
    <article
      aria-label={`${getWorkflowNodeTitle(node)} 節點`}
      className={`workflow-node-card ${selected ? "workflow-node-card--selected" : ""}`}
      data-node-category={node.type.split(".")[0]}
      data-current-agent={isCurrentAgent ? "true" : undefined}
    >
      <div className="flex items-start gap-3 p-3.5 pb-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-muted text-foreground">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="truncate font-semibold text-sm">{getWorkflowNodeTitle(node)}</span>
          </div>
          <p className="line-clamp-2 min-h-8 text-muted-foreground text-xs leading-4">{getWorkflowNodeSummary(node)}</p>
        </div>
      </div>

      <footer className="flex items-center justify-between border-border/70 border-t px-2.5 py-1.5">
        <span className="font-mono text-[10px] text-muted-foreground">{WORKFLOW_NODE_META[node.type].category}</span>
        <div className="nodrag nopan flex items-center gap-0.5">
          <Button aria-label={`複製 ${getWorkflowNodeTitle(node)}`} onClick={() => data.onDuplicate(node.id)} size="icon-xs" variant="ghost">
            <CopyIcon aria-hidden="true" />
          </Button>
          <Button aria-label={`刪除 ${getWorkflowNodeTitle(node)}`} onClick={() => data.onDelete(node.id)} size="icon-xs" variant="ghost">
            <Trash2Icon aria-hidden="true" />
          </Button>
        </div>
      </footer>

      {isResource && <Handle className={`workflow-handle ${capabilitySourceClass}`} id="capability" position={Position.Right} style={{ top: 38 }} type="source" />}
      {isResource && CAPABILITY_TARGETS[node.type] && <Handle className="workflow-handle workflow-handle--capability" id={CAPABILITY_TARGETS[node.type]} position={Position.Left} style={{ top: 38 }} type="target" />}
      {node.type === "resource.agent" && <Handle className="workflow-handle workflow-handle--delegation" id="delegation" position={Position.Right} style={{ top: 68 }} type="source" />}
      {node.type === "resource.agent" && <Handle className="workflow-handle workflow-handle--delegation" id="primary" position={Position.Left} style={{ top: 68 }} type="target" />}
      {node.type === "resource.agent" && <Handle className="workflow-handle workflow-handle--delegation" id="subagent" position={Position.Left} style={{ top: 92 }} type="target" />}
    </article>
  )
}
