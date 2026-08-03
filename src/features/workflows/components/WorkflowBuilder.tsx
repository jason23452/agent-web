import { useEffect, useState } from "react"
import { BracesIcon, Layers2Icon, ListTreeIcon, PanelRightCloseIcon, PlayIcon, PlusIcon, Settings2Icon, XIcon } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/shared/components/ui/dialog"
import { toastManager } from "@/shared/components/ui/toast"
import type { ResourceNodeData, WorkflowEdge, WorkflowNode, WorkflowPaletteItem, WorkflowPosition, WorkflowTarget, WorkflowV1 } from "@/features/workflows/types"
import { createCapabilityEdge, createDelegationEdge, createNodeFromPalette, createPrimaryLinkEdge, duplicateWorkflowNode, getWorkflowNodeTitle, isPromptEditableWorkflowNode, isProtectedWorkflow, normalizeWorkflowSchemaVersion, resolveConnectionKind, resolveWorkflowAgentRoles, syncCommandContentForAgents, syncCommandNodeToAgent, syncWorkflowAgentConfigs, touchWorkflow, validateWorkflowAgentEdge, workflowFrontmatterValue } from "@/features/workflows/workflowUtils"
import { useWorkflowBuilder } from "@/features/workflows/hooks/useWorkflowBuilder"
import { WorkflowBrowser } from "@/features/workflows/components/WorkflowBrowser"
import { WorkflowAgentAppPanel } from "@/features/workflows/components/WorkflowAgentAppPanel"
import { WorkflowCanvas } from "@/features/workflows/components/WorkflowCanvas"
import { WorkflowConfirmDialog, type WorkflowRequestedAction } from "@/features/workflows/components/WorkflowConfirmDialog"
import { WorkflowInspector } from "@/features/workflows/components/WorkflowInspector"
import { WorkflowJsonPanel } from "@/features/workflows/components/WorkflowJsonPanel"
import { WorkflowPalette } from "@/features/workflows/components/WorkflowPalette"
import { WorkflowProductNav } from "@/features/workflows/components/WorkflowProductNav"
import { WorkflowPublishReport } from "@/features/workflows/components/WorkflowPublishReport"
import { WorkflowPromptWriterDialog } from "@/features/workflows/components/WorkflowPromptWriterDialog"
import { WorkflowResourceConfigPanel } from "@/features/workflows/components/WorkflowResourceConfigPanels"
import { WorkflowRunPanel } from "@/features/workflows/components/WorkflowRunPanel"
import { WorkflowTestChatDialog } from "@/features/workflows/components/WorkflowTestChatDialog"
import { WorkflowTopbar } from "@/features/workflows/components/WorkflowTopbar"
import type { ModelOption } from "@/shared/types/workspace"
import { buildAgentModelKeys } from "@/shared/utils/openCodeModelUtils"

type RightTab = "palette" | "apps" | "inspector" | "run" | "json"

const RIGHT_TABS = [
  { id: "palette", label: "節點", icon: PlusIcon },
  { id: "apps", label: "Apps", icon: Layers2Icon },
  { id: "inspector", label: "檢查", icon: Settings2Icon },
  { id: "run", label: "執行", icon: PlayIcon },
  { id: "json", label: "JSON", icon: BracesIcon },
] satisfies Array<{ id: RightTab; label: string; icon: typeof PlusIcon }>

export function WorkflowBuilder({ modelOptions = [], onBack, project }: { modelOptions?: ModelOption[]; onBack: () => void; project?: string }) {
  const builder = useWorkflowBuilder(project)
  const [selectedNodeID, setSelectedNodeID] = useState<string | null>(null)
  const [selectedEdgeID, setSelectedEdgeID] = useState<string | null>(null)
  const [rightTab, setRightTab] = useState<RightTab>("palette")
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [browserOpen, setBrowserOpen] = useState(false)
  const [requestedAction, setRequestedAction] = useState<WorkflowRequestedAction | null>(null)
  const [publishReportOpen, setPublishReportOpen] = useState(false)
  const [testChatOpen, setTestChatOpen] = useState(false)
  const [promptWriterTargetID, setPromptWriterTargetID] = useState<string | null>(null)
  const [nodeDetailOpen, setNodeDetailOpen] = useState(false)
  const [cacheTarget, setCacheTarget] = useState<WorkflowTarget>("workflow-test")
  const busy = Boolean(builder.busyAction)
  const protectedWorkflow = isProtectedWorkflow(builder.workflow)
  const selectedNode = builder.workflow.nodes.find((node) => node.id === selectedNodeID) ?? null
  const selectedEdge = builder.workflow.edges.find((edge) => edge.id === selectedEdgeID) ?? null
  const selectedResourceNode = selectedNode?.type.startsWith("resource.") ? selectedNode : null
  const promptWriterTarget = builder.workflow.nodes.find((node) => node.id === promptWriterTargetID) ?? null
  const availableModels = buildAgentModelKeys(modelOptions)
  const activeModelOptions = modelOptions.length > 0 ? modelOptions : undefined
  const polling = builder.run?.status === "queued" || builder.run?.status === "running"
  const testChatDisabled = busy || builder.dirty || !builder.persisted || !builder.testPublished
  const workflowRoles = resolveWorkflowAgentRoles(builder.workflow)
  const currentAgentID = selectedNode?.type === "resource.agent"
    ? selectedNode.id
    : [...workflowRoles.entryPrimaryIDs][0] ?? null

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const editing = target?.matches("input, textarea, select, [contenteditable='true']")
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        if (!busy) void builder.save()
        return
      }
      if (editing) return
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d" && selectedNodeID) {
        event.preventDefault()
        duplicateNode(selectedNodeID)
      }
      if ((event.key === "Delete" || event.key === "Backspace") && (selectedNodeID || selectedEdgeID)) {
        if (selectedNodeID) deleteNodes([selectedNodeID])
        if (selectedEdgeID) deleteEdges([selectedEdgeID])
      }
      if (event.key === "Escape") setRightPanelOpen(false)
    }
    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  })

  function mutate(updater: (workflow: WorkflowV1) => WorkflowV1) {
    builder.updateDraft((workflow) => syncWorkflowAgentConfigs(normalizeWorkflowSchemaVersion(updater(workflow))))
  }

  function addNode(item: WorkflowPaletteItem, position?: WorkflowPosition) {
    if (item.disabled) return
    if (!builder.workflow.nodes.length && item.type !== "resource.command") {
      toastManager.add({ id: `workflow-command-first-${Date.now()}`, title: "第一個 node 必須是 Command", description: "請先建立 Command，再新增 Agent 或其他資源。", type: "warning" })
      return
    }
    if (!builder.workflow.nodes.some((node) => node.type === "resource.command") && item.type !== "resource.command") {
      toastManager.add({ id: `workflow-command-required-${Date.now()}`, title: "請先建立 Command", description: "Workflow 的第一個 node 必須是 Command。", type: "warning" })
      return
    }
    if (item.type === "resource.command" && builder.workflow.nodes.some((node) => node.type === item.type)) {
      toastManager.add({ id: `workflow-single-command-${Date.now()}`, title: "Agent App 只能有一個 Command", description: "請直接編輯目前畫布上的 Command。", type: "warning" })
      return
    }
    if (item.resource && builder.workflow.nodes.some((node) => node.type === item.type && (node.data as ResourceNodeData).name === item.resource?.name)) {
      toastManager.add({ id: `workflow-resource-${Date.now()}`, title: "資源已在畫布", description: `${item.resource.name} 已經加入目前 workflow。`, type: "info" })
      return
    }
    const fallbackPosition = { x: 310 + (builder.workflow.nodes.length % 3) * 38, y: (builder.workflow.nodes.length % 5 - 2) * 130 }
    const node = createNodeFromPalette(item, position ?? fallbackPosition, builder.workflow.nodes, builder.workflow.scope)
    mutate((workflow) => ({ ...workflow, nodes: node.type === "resource.command" ? [node, ...workflow.nodes] : [...workflow.nodes, node] }))
    setSelectedNodeID(node.id)
    setSelectedEdgeID(null)
    setRightTab("inspector")
    if ((node.data as ResourceNodeData).mode === "managed") setNodeDetailOpen(true)
  }

  function addEdge(edge: WorkflowEdge) {
    if (builder.workflow.edges.some((current) => current.source === edge.source && current.target === edge.target && current.kind === edge.kind)) return
    if (edge.kind === "delegation" || edge.kind === "primary-link") {
      const error = validateWorkflowAgentEdge({ nodes: builder.workflow.nodes, edges: builder.workflow.edges }, edge)
      if (error) {
        toastManager.add({ id: `workflow-agent-edge-${Date.now()}`, title: "無法建立 Agent 連線", description: error, type: "warning" })
        return
      }
    }
    mutate((workflow) => {
      const source = workflow.nodes.find((node) => node.id === edge.source)
      const target = workflow.nodes.find((node) => node.id === edge.target)
      const syncedCommand = source && target ? syncCommandForAgent(source, target) : null
      const nextEdges = [...workflow.edges, edge]
      const command = workflow.nodes.find((node): node is WorkflowNode & { type: "resource.command"; data: ResourceNodeData } => node.type === "resource.command")
      const commandAgents = command
        ? nextEdges
          .filter((current) => current.kind === "capability" && current.source === command.id && current.targetHandle === "agent")
          .flatMap((current) => {
            const agent = workflow.nodes.find((node) => node.id === current.target && node.type === "resource.agent")
            return agent ? [agent] : []
          })
        : []
      const syncedMultiCommand = command && commandAgents.length !== 1
        ? { ...command, data: { ...(command.data as ResourceNodeData), content: syncCommandContentForAgents((command.data as ResourceNodeData).content, commandAgents.map((agent) => ({ name: (agent.data as ResourceNodeData).name, model: workflowFrontmatterValue((agent.data as ResourceNodeData).content, "model") }))) } }
        : null
      return {
        ...workflow,
        nodes: workflow.nodes.map((node) => node.id === syncedMultiCommand?.id
          ? syncedMultiCommand
          : syncedCommand && node.id === syncedCommand.id
            ? syncedCommand
            : node),
        edges: nextEdges,
      }
    })
    setSelectedEdgeID(edge.id)
    setSelectedNodeID(null)
    setRightTab("inspector")
    if (edge.targetHandle === "agent") showAgentSyncNotice()
    if (edge.kind === "delegation") showDelegationSyncNotice()
  }

  function moveNodes(positions: Array<{ id: string; position: WorkflowPosition }>) {
    const byID = new Map(positions.map((item) => [item.id, item.position]))
    mutate((workflow) => ({ ...workflow, nodes: workflow.nodes.map((node) => byID.has(node.id) ? { ...node, position: byID.get(node.id) ?? node.position } : node) }))
  }

  function deleteNodes(nodeIDs: string[]) {
    const removed = new Set(nodeIDs)
    if (builder.workflow.nodes.some((node) => removed.has(node.id) && node.type === "resource.command")) {
      toastManager.add({ id: `workflow-command-delete-${Date.now()}`, title: "Command 不可刪除", description: "Workflow 必須保留唯一且位於第一個位置的 Command。", type: "warning" })
      return
    }
    mutate((workflow) => {
      const nodes = workflow.nodes.filter((node) => !removed.has(node.id))
      const edges = workflow.edges.filter((edge) => !removed.has(edge.source) && !removed.has(edge.target))
      const command = nodes.find((node): node is WorkflowNode & { type: "resource.command"; data: ResourceNodeData } => node.type === "resource.command")
      const agents = command
        ? edges
          .filter((edge) => edge.kind === "capability" && edge.source === command.id && edge.targetHandle === "agent")
          .flatMap((edge) => {
            const agent = nodes.find((node) => node.id === edge.target && node.type === "resource.agent")
            return agent ? [agent] : []
          })
        : []
      return {
        ...workflow,
        nodes: command ? nodes.map((node) => node.id === command.id ? syncCommandForAgents(command, agents) ?? node : node) : nodes,
        edges,
      }
    })
    if (selectedNodeID && removed.has(selectedNodeID)) setSelectedNodeID(null)
  }

  function deleteEdges(edgeIDs: string[]) {
    const removed = new Set(edgeIDs)
    const command = builder.workflow.nodes.find((node): node is WorkflowNode & { type: "resource.command"; data: ResourceNodeData } => node.type === "resource.command")
    const commandAgentEdges = command ? builder.workflow.edges.filter((edge) => edge.kind === "capability" && edge.source === command.id && edge.targetHandle === "agent") : []
    const removedCommandAgentCount = commandAgentEdges.filter((edge) => removed.has(edge.id)).length
    if (command && removedCommandAgentCount >= commandAgentEdges.length) {
      toastManager.add({ id: `workflow-primary-edge-delete-${Date.now()}`, title: "至少需要一個 primary Agent", description: "Command 必須至少保留一條 primary Agent 連線。", type: "warning" })
      return
    }
    mutate((workflow) => {
      const edges = workflow.edges.filter((edge) => !removed.has(edge.id))
      const workflowCommand = workflow.nodes.find((node): node is WorkflowNode & { type: "resource.command"; data: ResourceNodeData } => node.type === "resource.command")
      const agents = workflowCommand
        ? edges
          .filter((edge) => edge.kind === "capability" && edge.source === workflowCommand.id && edge.targetHandle === "agent")
          .flatMap((edge) => {
            const agent = workflow.nodes.find((node) => node.id === edge.target && node.type === "resource.agent")
            return agent ? [agent] : []
          })
        : []
      return {
        ...workflow,
        edges,
        nodes: workflowCommand
          ? workflow.nodes.map((node) => node.id === workflowCommand.id ? syncCommandForAgents(workflowCommand, agents) ?? node : node)
          : workflow.nodes,
      }
    })
    if (selectedEdgeID && removed.has(selectedEdgeID)) setSelectedEdgeID(null)
  }

  function addDelegation(sourceAgentID: string, targetAgentID: string) {
    const source = builder.workflow.nodes.find((node) => node.id === sourceAgentID && node.type === "resource.agent")
    const target = builder.workflow.nodes.find((node) => node.id === targetAgentID && node.type === "resource.agent")
    if (!source || !target) return
    const edge = createDelegationEdge(source, target)
    if (!edge || builder.workflow.edges.some((current) => current.kind === "delegation" && current.source === edge.source && current.target === edge.target)) return
    addEdge(edge)
  }

  function addPrimaryLink(sourceAgentID: string, targetAgentID: string) {
    const source = builder.workflow.nodes.find((node) => node.id === sourceAgentID && node.type === "resource.agent")
    const target = builder.workflow.nodes.find((node) => node.id === targetAgentID && node.type === "resource.agent")
    if (!source || !target) return
    const edge = createPrimaryLinkEdge(source, target)
    if (!edge) return
    addEdge(edge)
  }

  function setCommandAgent(agentNodeID: string, enabled: boolean) {
    const command = builder.workflow.nodes.find((node) => node.type === "resource.command")
    const agent = builder.workflow.nodes.find((node) => node.id === agentNodeID && node.type === "resource.agent")
    if (!command || !agent) return
    const edge = createCapabilityEdge(command, agent)
    if (!edge) return
    const currentEdges = builder.workflow.edges.filter((current) => current.kind === "capability" && current.source === command.id && current.targetHandle === "agent")
    if (!enabled && currentEdges.length <= 1) {
      toastManager.add({ id: `workflow-primary-required-${Date.now()}`, title: "至少需要一個 primary Agent", description: "Command 必須至少連接一個 primary Agent。", type: "warning" })
      return
    }
    const nextEdges = enabled
      ? currentEdges.some((current) => current.target === agent.id) ? builder.workflow.edges : [...builder.workflow.edges, edge]
      : builder.workflow.edges.filter((current) => !(current.kind === "capability" && current.source === command.id && current.target === agent.id && current.targetHandle === "agent"))
    const nextAgents = nextEdges
      .filter((current) => current.kind === "capability" && current.source === command.id && current.targetHandle === "agent")
      .flatMap((current) => {
        const target = builder.workflow.nodes.find((node) => node.id === current.target && node.type === "resource.agent")
        return target ? [target] : []
      })
    mutate((workflow) => ({
      ...workflow,
      edges: nextEdges,
      nodes: workflow.nodes.map((node) => node.id === command.id ? syncCommandForAgents(node, nextAgents) ?? node : node),
    }))
    if (enabled) setSelectedNodeID(agent.id)
    setSelectedEdgeID(null)
    showAgentSyncNotice()
  }

  function addAgentCapability(agentNodeID: string, capabilityNodeID: string) {
    const agent = builder.workflow.nodes.find((node) => node.id === agentNodeID && node.type === "resource.agent")
    const capability = builder.workflow.nodes.find((node) => node.id === capabilityNodeID)
    if (!agent || !capability) return
    const edge = createCapabilityEdge(capability, agent)
    if (!edge || builder.workflow.edges.some((current) => current.source === edge.source && current.target === edge.target && current.kind === "capability")) return
    mutate((workflow) => ({ ...workflow, edges: [...workflow.edges, edge] }))
  }

  function openPalette() {
    setRightTab("palette")
    setRightPanelOpen(true)
  }

  function openPromptWriter(nodeID: string) {
    const node = builder.workflow.nodes.find((candidate) => candidate.id === nodeID)
    if (!isPromptEditableWorkflowNode(node)) return
    setNodeDetailOpen(false)
    setPromptWriterTargetID(nodeID)
  }

  function applyPromptWriterPrompt(content: string) {
    const node = promptWriterTargetID ? builder.workflow.nodes.find((candidate) => candidate.id === promptWriterTargetID) : null
    if (!isPromptEditableWorkflowNode(node)) return
    updateNode({ ...node, data: { ...node.data, content } })
    setSelectedNodeID(node.id)
    setSelectedEdgeID(null)
    toastManager.add({ id: `workflow-prompt-writer-applied-${Date.now()}`, title: "Prompt 已套用", description: `已更新 ${getWorkflowNodeTitle(node)}；請儲存並重新測試發布 Workflow。`, type: "success" })
  }

  function closePromptWriter(open: boolean) {
    if (open) return
    const targetNode = promptWriterTargetID ? builder.workflow.nodes.find((node) => node.id === promptWriterTargetID) : null
    setPromptWriterTargetID(null)
    if (!targetNode) return
    setSelectedNodeID(targetNode.id)
    setSelectedEdgeID(null)
    setNodeDetailOpen(true)
  }

  function duplicateNode(nodeID: string) {
    const source = builder.workflow.nodes.find((node) => node.id === nodeID)
    if (!source) return
    if (source.type === "resource.command") {
      toastManager.add({ id: `workflow-command-duplicate-${Date.now()}`, title: "Command 不可複製", description: "Workflow 只能有一個 Command。", type: "warning" })
      return
    }
    const duplicate = duplicateWorkflowNode(source, builder.workflow.nodes)
    mutate((workflow) => ({ ...workflow, nodes: [...workflow.nodes, duplicate] }))
    setSelectedNodeID(duplicate.id)
    setSelectedEdgeID(null)
  }

  function lockNode(nodeID: string) {
    mutate((workflow) => ({ ...workflow, nodes: workflow.nodes.map((node) => node.id === nodeID && !node.type.startsWith("trigger.") ? { ...node, lock: { enabled: !node.lock?.enabled, mode: "last-success" } } : node) }))
  }

  function updateNode(nextNode: WorkflowNode) {
    const previousID = selectedNodeID ?? nextNode.id
    if (nextNode.id !== previousID && builder.workflow.nodes.some((node) => node.id === nextNode.id)) {
      toastManager.add({ id: `workflow-node-id-${Date.now()}`, title: "Node ID 已存在", description: "請使用 workflow 內唯一的 Node ID。", type: "error" })
      return
    }
    mutate((workflow) => {
      const edges = workflow.edges.map((edge) => ({ ...edge, source: edge.source === previousID ? nextNode.id : edge.source, target: edge.target === previousID ? nextNode.id : edge.target }))
      let nodes = workflow.nodes.map((node) => node.id === previousID ? nextNode : node)
      const updatedNode = nodes.find((node) => node.id === nextNode.id)
      if (updatedNode?.type === "resource.agent") {
        const command = nodes.find((node) => node.type === "resource.command")
        const connected = command && edges.some((edge) => edge.kind === "capability" && edge.source === command.id && edge.target === updatedNode.id && edge.targetHandle === "agent")
        if (command && connected) {
          const connectedAgents = edges
            .filter((edge) => edge.kind === "capability" && edge.source === command.id && edge.targetHandle === "agent")
            .flatMap((edge) => {
              const agent = nodes.find((node) => node.id === edge.target && node.type === "resource.agent")
              return agent ? [agent] : []
            })
          const syncedCommand = syncCommandForAgents(command, connectedAgents)
          if (syncedCommand) nodes = nodes.map((node) => node.id === syncedCommand.id ? syncedCommand : node)
        }
      }
      if (updatedNode?.type === "resource.command") {
        const connectedAgents = edges
          .filter((edge) => edge.kind === "capability" && edge.source === updatedNode.id && edge.targetHandle === "agent")
          .flatMap((edge) => {
            const agent = nodes.find((node) => node.id === edge.target && node.type === "resource.agent")
            return agent ? [agent] : []
          })
        if (connectedAgents.length > 0) {
          const syncedCommand = syncCommandForAgents(updatedNode, connectedAgents)
          if (syncedCommand) nodes = nodes.map((node) => node.id === syncedCommand.id ? syncedCommand : node)
        }
      }
      return { ...workflow, nodes, edges }
    })
    setSelectedNodeID(nextNode.id)
  }

  function syncCommandForAgent(command: WorkflowNode, agent: WorkflowNode) {
    const agentData = agent.type === "resource.agent" ? agent.data as ResourceNodeData : null
    const catalogAgent = agentData ? builder.catalog?.resources.agents.find((resource) => resource.name === agentData.name && (resource.scope === agentData.scope || !resource.scope)) : undefined
    return syncCommandNodeToAgent(command, agent, catalogAgent?.model)
  }

  function syncCommandForAgents(command: WorkflowNode, agents: WorkflowNode[]) {
    if (command.type !== "resource.command") return null
    const models = agents.flatMap((agent) => {
      if (agent.type !== "resource.agent") return []
      const data = agent.data as ResourceNodeData
      const catalogAgent = builder.catalog?.resources.agents.find((resource) => resource.name === data.name && (resource.scope === data.scope || !resource.scope))
      return [{ name: data.name, model: catalogAgent?.model ?? workflowFrontmatterValue(data.content, "model") }]
    })
    return { ...command, data: { ...(command.data as ResourceNodeData), content: syncCommandContentForAgents((command.data as ResourceNodeData).content, models) } }
  }

  function showAgentSyncNotice() {
    toastManager.add({ id: `workflow-agent-sync-${Date.now()}`, title: "Agent 設定已同步", description: "Command 的 Agent 與 Model 已從目前連接的 Agent 帶入。", type: "success" })
  }

  function showDelegationSyncNotice() {
    toastManager.add({ id: `workflow-delegation-sync-${Date.now()}`, title: "Delegation graph 已同步", description: "儲存時會由 managed parent Agent 的 graph 產生 permission.task；reference Agent 不能作為 delegation parent。", type: "success" })
  }

  function updateEdge(nextEdge: WorkflowEdge) {
    const current = builder.workflow.edges.find((edge) => edge.id === nextEdge.id)
    if (!current) return
    const source = builder.workflow.nodes.find((node) => node.id === nextEdge.source)
    const target = builder.workflow.nodes.find((node) => node.id === nextEdge.target)
    const agentKind = nextEdge.kind === "primary-link" || nextEdge.kind === "delegation" ? nextEdge.kind : undefined
    if (resolveConnectionKind(source, target, nextEdge.sourceHandle, nextEdge.targetHandle, agentKind) !== nextEdge.kind) {
      toastManager.add({ id: `workflow-edge-kind-${Date.now()}`, title: "連線類型與 handle 不相容", description: "請刪除連線後從正確的 handle 重新建立。", type: "warning" })
      return
    }
    const candidateWorkflow = { ...builder.workflow, edges: builder.workflow.edges.filter((edge) => edge.id !== nextEdge.id) }
    if (nextEdge.kind === "delegation" || nextEdge.kind === "primary-link") {
      const error = validateWorkflowAgentEdge(candidateWorkflow, nextEdge)
      if (error) {
        toastManager.add({ id: `workflow-edge-update-${Date.now()}`, title: "無法更新 Agent 連線", description: error, type: "warning" })
        return
      }
    }
    mutate((workflow) => ({ ...workflow, edges: workflow.edges.map((edge) => edge.id === nextEdge.id ? nextEdge : edge) }))
  }

  function openNodeDetails(nodeID: string) {
    const node = builder.workflow.nodes.find((candidate) => candidate.id === nodeID)
    if (node?.type === "resource.command") {
      const agents = builder.workflow.edges
        .filter((edge) => edge.kind === "capability" && edge.source === node.id && edge.targetHandle === "agent")
        .flatMap((edge) => {
          const agent = builder.workflow.nodes.find((candidate) => candidate.id === edge.target && candidate.type === "resource.agent")
          return agent ? [agent] : []
        })
      const syncedCommand = syncCommandForAgents(node, agents)
      const syncedData = syncedCommand?.data as ResourceNodeData | undefined
      const nodeData = node.data as ResourceNodeData
      if (syncedCommand && syncedData?.content !== nodeData.content) {
        mutate((workflow) => ({ ...workflow, nodes: workflow.nodes.map((candidate) => candidate.id === syncedCommand.id ? syncedCommand : candidate) }))
      }
    }
    setSelectedNodeID(nodeID)
    setSelectedEdgeID(null)
    setNodeDetailOpen(true)
  }

  function importDraft(workflow: WorkflowV1) {
    builder.replaceDraft(syncWorkflowAgentConfigs(normalizeWorkflowSchemaVersion(touchWorkflow(workflow, {}))))
    setSelectedNodeID(workflow.nodes[0]?.id ?? null)
    setSelectedEdgeID(null)
    setRightTab("inspector")
  }

  async function confirmAction(action: WorkflowRequestedAction) {
    if (protectedWorkflow && action.target === "main") {
      toastManager.add({ id: `workflow-test-only-${Date.now()}`, title: "僅限測試環境", description: "Workflow Node Prompt Writer 不會發布或執行到正式環境。", type: "warning" })
      return
    }
    try {
      if (action.kind === "publish") {
        await builder.publish(action.target)
        setPublishReportOpen(true)
      } else {
        await builder.startRun(action.target)
        setCacheTarget(action.target)
        setRightTab("run")
        setRightPanelOpen(true)
      }
      setRequestedAction(null)
    } catch {
      // The API hook already exposes a contextual toast and keeps the dialog open for retry.
    }
  }

  return (
    <main className="workflow-builder" aria-label="Workflow Builder">
      <WorkflowProductNav
        onBack={onBack}
        onBrowse={() => setBrowserOpen(true)}
        onOpenPanel={() => setRightPanelOpen(true)}
        project={project}
        workflowName={builder.workflow.name}
      />
      <WorkflowTopbar
        busy={busy}
        dirty={builder.dirty}
        onBrowse={() => setBrowserOpen(true)}
        onNameChange={(name) => mutate((workflow) => ({ ...workflow, name }))}
        onOpenPanel={() => setRightPanelOpen(true)}
        onOpenTestChat={() => setTestChatOpen(true)}
        onRequestAction={setRequestedAction}
        onSave={async () => { await builder.save() }}
        persisted={builder.persisted}
        protectedWorkflow={protectedWorkflow}
        testChatDisabled={testChatDisabled}
        workflow={builder.workflow}
      />
      <WorkflowCanvas
        currentAgentID={currentAgentID}
        edges={builder.workflow.edges}
        nodes={builder.workflow.nodes}
        onAddEdge={addEdge}
        onAddNode={addNode}
        onDeleteEdges={deleteEdges}
        onDeleteNodes={deleteNodes}
        onDuplicateNode={duplicateNode}
        onLockNode={lockNode}
        onMoveNodes={moveNodes}
        onOpenNodeDetails={openNodeDetails}
        onSelectEdge={(edgeID) => { setSelectedEdgeID(edgeID); if (edgeID) { setRightTab("inspector"); setRightPanelOpen(true) } }}
        onSelectNode={(nodeID) => { setSelectedNodeID(nodeID); setSelectedEdgeID(null) }}
        selectedEdgeID={selectedEdgeID}
        selectedNodeID={selectedNodeID}
      />

      <aside className={`workflow-builder-panel ${rightPanelOpen ? "workflow-builder-panel--open" : ""}`} aria-label="Workflow 工具面板">
        <div className="flex items-center border-border border-b px-2 py-2">
            <div aria-label="Workflow 工具" className="grid flex-1 grid-cols-5 rounded-lg bg-muted p-0.5" role="tablist">
            {RIGHT_TABS.map((tab) => { const Icon = tab.icon; return <button aria-controls={`workflow-panel-${tab.id}`} aria-selected={rightTab === tab.id} className={`flex min-h-8 items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring ${rightTab === tab.id ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`} key={tab.id} onClick={() => setRightTab(tab.id)} role="tab" type="button"><Icon aria-hidden="true" className="size-3.5" />{tab.label}</button> })}
          </div>
          <Button aria-label="關閉工具面板" className="ml-1 min-[1001px]:hidden" onClick={() => setRightPanelOpen(false)} size="icon-sm" variant="ghost"><XIcon aria-hidden="true" /></Button>
        </div>
        <div className="min-h-0 overflow-hidden" id={`workflow-panel-${rightTab}`} role="tabpanel">
            {rightTab === "palette" && <WorkflowPalette catalog={builder.catalog} error={builder.catalogError} loading={builder.catalogLoading} nodes={builder.workflow.nodes} onAdd={(item) => addNode(item)} protectedWorkflow={protectedWorkflow} />}
            {rightTab === "apps" && <WorkflowAgentAppPanel onAddCapability={addAgentCapability} onAddPrimaryLink={addPrimaryLink} onAddDelegation={addDelegation} onOpenPalette={openPalette} onRemoveEdge={(edgeID) => deleteEdges([edgeID])} onSelectNode={(nodeID) => { setSelectedNodeID(nodeID); setSelectedEdgeID(null); setRightTab("inspector") }} onSetCommandAgent={setCommandAgent} protectedWorkflow={protectedWorkflow} workflow={builder.workflow} />}
            {rightTab === "inspector" && <WorkflowInspector availableModels={availableModels} cacheMetadata={builder.cacheMetadata} edges={builder.workflow.edges} nodes={builder.workflow.nodes} onClearCache={builder.clearCache} onDeleteEdge={(id) => deleteEdges([id])} onDeleteNode={(id) => deleteNodes([id])} onDuplicateNode={duplicateNode} onOpenPromptWriter={openPromptWriter} onTargetChange={setCacheTarget} onUpdateEdge={updateEdge} onUpdateNode={updateNode} run={builder.run} selectedEdge={selectedEdge} selectedNode={selectedNode} target={cacheTarget} workflowScope={builder.workflow.scope} />}
          {rightTab === "run" && <WorkflowRunPanel nodes={builder.workflow.nodes} polling={polling} run={builder.run} />}
           {rightTab === "json" && <WorkflowJsonPanel onImport={importDraft} onValidateImport={(workflow, signal) => builder.validateImport(workflow, { signal })} protectedWorkflow={protectedWorkflow} workflow={builder.workflow} />}
        </div>
      </aside>
      {rightPanelOpen && <button aria-label="關閉 Workflow 工具面板" className="workflow-panel-backdrop" onClick={() => setRightPanelOpen(false)} type="button" />}

      <div className="workflow-shortcuts" aria-hidden="true"><ListTreeIcon className="size-3" />Ctrl S 儲存 · Ctrl D 複製 · Delete 移除</div>
      <Button aria-label={rightPanelOpen ? "關閉工具面板" : "開啟工具面板"} className="workflow-panel-toggle" onClick={() => setRightPanelOpen((current) => !current)} size="icon" variant="outline"><PanelRightCloseIcon aria-hidden="true" /></Button>

      <WorkflowBrowser activeWorkflowID={builder.workflow.id} busy={busy} error={builder.libraryError} loading={builder.libraryLoading} onCreate={builder.createNew} onDelete={builder.remove} onLoad={async (summary) => { await builder.load(summary); setSelectedNodeID(null); setSelectedEdgeID(null); setBrowserOpen(false) }} onOpenChange={setBrowserOpen} open={browserOpen} project={project} workflows={builder.workflows} />
      <WorkflowConfirmDialog action={requestedAction} busy={busy} name={builder.workflow.name} onConfirm={confirmAction} onOpenChange={(open) => { if (!open && !busy) setRequestedAction(null) }} scope={builder.workflow.scope} />
       <WorkflowPublishReport onOpenChange={setPublishReportOpen} open={publishReportOpen} report={builder.publishReport} />
       <WorkflowTestChatDialog catalog={builder.catalog} key={`${builder.workflow.id}:${testChatOpen ? "open" : "closed"}`} modelOptions={modelOptions} onOpenChange={setTestChatOpen} open={testChatOpen} published={builder.testPublished && !builder.dirty} workflow={builder.workflow} />
       <WorkflowPromptWriterDialog key={`${builder.workflow.id}:${promptWriterTargetID ?? "none"}`} onApplyPrompt={applyPromptWriterPrompt} onOpenChange={closePromptWriter} open={Boolean(promptWriterTarget)} targetNode={promptWriterTarget} workflow={builder.workflow} />
         <Dialog onOpenChange={setNodeDetailOpen} open={nodeDetailOpen}>
         <DialogPopup className="max-w-4xl" closeProps={{ "aria-label": "關閉節點詳細配置" }}>
           <DialogHeader>
             <DialogTitle>{selectedNode?.type.startsWith("resource.") ? `${getWorkflowNodeTitle(selectedNode)} 設定` : "節點詳細配置"}</DialogTitle>
             <DialogDescription>{selectedNode ? getWorkflowNodeTitle(selectedNode) : "選取的 Agent App resource"}</DialogDescription>
           </DialogHeader>
           <DialogPanel className="min-h-0 overflow-hidden p-0">
              {selectedResourceNode ? (
                  <WorkflowResourceConfigPanel availableModels={availableModels} edges={builder.workflow.edges} key={`${selectedResourceNode.id}:${builder.workflow.edges.map((edge) => edge.id).join("|")}`} modelOptions={activeModelOptions} node={selectedResourceNode} nodes={builder.workflow.nodes} onAddDelegation={addDelegation} onClose={() => setNodeDetailOpen(false)} onOpenPromptWriter={openPromptWriter} onRemoveDelegation={(edgeID) => deleteEdges([edgeID])} onUpdateNode={updateNode} project={project} />
               ) : (
                 <div className="max-h-[68vh] overflow-y-auto">
                    <WorkflowInspector availableModels={availableModels} cacheMetadata={builder.cacheMetadata} edges={builder.workflow.edges} nodes={builder.workflow.nodes} onClearCache={builder.clearCache} onDeleteEdge={(id) => deleteEdges([id])} onDeleteNode={(id) => { deleteNodes([id]); setNodeDetailOpen(false) }} onDuplicateNode={duplicateNode} onOpenPromptWriter={openPromptWriter} onTargetChange={setCacheTarget} onUpdateEdge={updateEdge} onUpdateNode={updateNode} run={builder.run} selectedEdge={null} selectedNode={selectedNode} target={cacheTarget} workflowScope={builder.workflow.scope} />
                 </div>
             )}
           </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>完成配置</DialogClose>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </main>
  )
}
