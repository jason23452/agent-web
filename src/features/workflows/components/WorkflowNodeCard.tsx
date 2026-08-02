import { Handle, Position, type Node, type NodeProps } from "@xyflow/react"
import {
  BotIcon,
  BoxIcon,
  BracesIcon,
  CommandIcon,
  CopyIcon,
  FlagIcon,
  GitBranchIcon,
  LockIcon,
  MessageSquareTextIcon,
  PlugZapIcon,
  RotateCwIcon,
  SparklesIcon,
  Trash2Icon,
  UnlockIcon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import type { WorkflowNode } from "@/features/workflows/types"
import { getWorkflowNodeSummary, getWorkflowNodeTitle, WORKFLOW_NODE_META } from "@/features/workflows/workflowUtils"

export type WorkflowCanvasNodeData = Record<string, unknown> & {
  workflowNode: WorkflowNode
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

const PROMPT_BINDINGS = ["agent", "skill", "tool", "mcp"]
const COMMAND_BINDINGS = ["command", "agent"]

export function WorkflowNodeCard({ data, selected }: NodeProps<WorkflowCanvasNode>) {
  const node = data.workflowNode
  const Icon = TYPE_ICONS[node.type]
  const isResource = node.type.startsWith("resource.")
  const isAction = node.type.startsWith("action.")
  const bindings = node.type === "action.prompt" ? PROMPT_BINDINGS : node.type === "action.command" ? COMMAND_BINDINGS : []

  return (
    <article
      aria-label={`${getWorkflowNodeTitle(node)} 節點`}
      className={`workflow-node-card ${selected ? "workflow-node-card--selected" : ""}`}
      data-node-category={node.type.split(".")[0]}
    >
      {isAction && <Handle className="workflow-handle workflow-handle--control" id="control-input" position={Position.Left} style={{ top: 22 }} type="target" />}
      {bindings.map((binding, index) => (
        <Handle
          className="workflow-handle workflow-handle--binding"
          id={binding}
          key={binding}
          position={Position.Left}
          style={{ top: 52 + index * 22 }}
          type="target"
        />
      ))}
      {isAction && (
        <Handle
          className="workflow-handle workflow-handle--data"
          id="context"
          position={Position.Bottom}
          style={{ left: 56 }}
          type="target"
        />
      )}

      <div className="flex items-start gap-3 p-3.5 pb-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-muted text-foreground">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="truncate font-semibold text-sm">{getWorkflowNodeTitle(node)}</span>
            {node.lock?.enabled && (
              <Badge className="gap-1" size="sm" variant="warning">
                <LockIcon aria-hidden="true" /> Locked
              </Badge>
            )}
          </div>
          <p className="line-clamp-2 min-h-8 text-muted-foreground text-xs leading-4">{getWorkflowNodeSummary(node)}</p>
        </div>
      </div>

      <footer className="flex items-center justify-between border-border/70 border-t px-2.5 py-1.5">
        <span className="font-mono text-[10px] text-muted-foreground">{WORKFLOW_NODE_META[node.type].category}</span>
        <div className="nodrag nopan flex items-center gap-0.5">
          {isAction && (
            <Button
              aria-label={node.lock?.enabled ? `解鎖 ${getWorkflowNodeTitle(node)}` : `鎖定 ${getWorkflowNodeTitle(node)}`}
              onClick={() => data.onLockToggle(node.id)}
              size="icon-xs"
              variant="ghost"
            >
              {node.lock?.enabled ? <UnlockIcon aria-hidden="true" /> : <LockIcon aria-hidden="true" />}
            </Button>
          )}
          <Button aria-label={`複製 ${getWorkflowNodeTitle(node)}`} onClick={() => data.onDuplicate(node.id)} size="icon-xs" variant="ghost">
            <CopyIcon aria-hidden="true" />
          </Button>
          <Button aria-label={`刪除 ${getWorkflowNodeTitle(node)}`} onClick={() => data.onDelete(node.id)} size="icon-xs" variant="ghost">
            <Trash2Icon aria-hidden="true" />
          </Button>
        </div>
      </footer>

      {(node.type.startsWith("trigger.") || isAction) && (
        <Handle className="workflow-handle workflow-handle--control" id="control-output" position={Position.Right} type="source" />
      )}
      {isAction && (
        <Handle className="workflow-handle workflow-handle--data" id="output" position={Position.Bottom} style={{ left: 194 }} type="source" />
      )}
      {isResource && <Handle className="workflow-handle workflow-handle--binding" id="resource" position={Position.Right} type="source" />}
    </article>
  )
}
