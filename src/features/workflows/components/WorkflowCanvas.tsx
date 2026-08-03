import { startTransition, useEffect, useMemo, useRef, useState, type DragEvent } from "react"
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { AlertTriangleIcon, MousePointer2Icon } from "lucide-react"
import type { WorkflowEdge, WorkflowNode, WorkflowPaletteItem, WorkflowPosition } from "@/features/workflows/types"
import { getEdgeLabel, resolveConnectionKind, validateWorkflowAgentEdge, wouldCreateControlCycle } from "@/features/workflows/workflowUtils"
import { WorkflowNodeCard, type WorkflowCanvasNode, type WorkflowCanvasNodeData } from "@/features/workflows/components/WorkflowNodeCard"

type WorkflowCanvasEdge = Edge<{ kind: WorkflowEdge["kind"] }>

const nodeTypes = { "workflow-node": WorkflowNodeCard }

type CanvasCallbacks = {
  onDelete: (nodeID: string) => void
  onDuplicate: (nodeID: string) => void
  onLockToggle: (nodeID: string) => void
}

function buildCanvasNodes(nodes: WorkflowNode[], selectedNodeID: string | null, currentAgentID: string | null, callbacks: CanvasCallbacks): WorkflowCanvasNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: "workflow-node",
    position: node.position,
    selected: node.id === selectedNodeID,
    data: {
      workflowNode: node,
      currentAgentID,
      onDelete: callbacks.onDelete,
      onDuplicate: callbacks.onDuplicate,
      onLockToggle: callbacks.onLockToggle,
    } satisfies WorkflowCanvasNodeData,
  }))
}

function mergeCanvasNodes(current: WorkflowCanvasNode[], next: WorkflowCanvasNode[]): WorkflowCanvasNode[] {
  const currentByID = new Map(current.map((node) => [node.id, node]))
  return next.map((node) => {
    const previous = currentByID.get(node.id)
    if (!previous) return node
    if (previous.data.workflowNode === node.data.workflowNode && previous.data.currentAgentID === node.data.currentAgentID && previous.data.onDelete === node.data.onDelete && previous.data.onDuplicate === node.data.onDuplicate && previous.data.onLockToggle === node.data.onLockToggle && previous.selected === node.selected && previous.position.x === node.position.x && previous.position.y === node.position.y) return previous
    return {
      ...node,
      width: previous.width,
      height: previous.height,
      measured: previous.measured,
    }
  })
}

function buildCanvasEdges(edges: WorkflowEdge[], nodes: WorkflowNode[], currentAgentID: string | null, selectedEdgeID: string | null): WorkflowCanvasEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    selected: edge.id === selectedEdgeID,
    type: "smoothstep",
    label: getEdgeLabel(edge.kind),
    className: `workflow-edge workflow-edge--${edgePresentation(edge, nodes, currentAgentID)}`,
    markerEnd: { type: MarkerType.ArrowClosed },
    data: { kind: edge.kind },
  }))
}

function edgePresentation(edge: WorkflowEdge, nodes: WorkflowNode[], currentAgentID: string | null) {
  if (edge.kind === "primary-link") return "primary-link"
  if (edge.kind === "delegation") return "delegation"
  if (edge.kind === "capability") {
    const source = nodes.find((node) => node.id === edge.source)
    const target = nodes.find((node) => node.id === edge.target)
    if (source?.type === "resource.command" && target?.type === "resource.agent") return "entry"
    if (source?.type === "resource.agent") return source.id === currentAgentID ? "current-capability" : "capability-muted"
  }
  return edge.kind.replace(".", "-")
}

function mergeCanvasEdges(current: WorkflowCanvasEdge[], next: WorkflowCanvasEdge[]): WorkflowCanvasEdge[] {
  const currentByID = new Map(current.map((edge) => [edge.id, edge]))
  return next.map((edge) => {
    const previous = currentByID.get(edge.id)
    if (!previous) return edge
    if (previous.source === edge.source && previous.target === edge.target && previous.sourceHandle === edge.sourceHandle && previous.targetHandle === edge.targetHandle && previous.selected === edge.selected && previous.className === edge.className && previous.label === edge.label) return previous
    return { ...previous, ...edge }
  })
}

type WorkflowCanvasProps = {
  edges: WorkflowEdge[]
  nodes: WorkflowNode[]
  selectedEdgeID: string | null
  selectedNodeID: string | null
  onAddEdge: (edge: WorkflowEdge) => void
  onAddNode: (item: WorkflowPaletteItem, position: WorkflowPosition) => void
  onDeleteEdges: (edgeIDs: string[]) => void
  onDeleteNodes: (nodeIDs: string[]) => void
  onDuplicateNode: (nodeID: string) => void
  onLockNode: (nodeID: string) => void
  onMoveNodes: (positions: Array<{ id: string; position: WorkflowPosition }>) => void
  onOpenNodeDetails: (nodeID: string) => void
  onSelectEdge: (edgeID: string | null) => void
  onSelectNode: (nodeID: string | null) => void
  currentAgentID: string | null
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

function WorkflowCanvasInner({
  edges,
  nodes,
  selectedEdgeID,
  selectedNodeID,
  onAddEdge,
  onAddNode,
  onDeleteEdges,
  onDeleteNodes,
  onDuplicateNode,
  onLockNode,
  onMoveNodes,
  onOpenNodeDetails,
  onSelectEdge,
  onSelectNode,
  currentAgentID,
}: WorkflowCanvasProps) {
  const [instance, setInstance] = useState<ReactFlowInstance<WorkflowCanvasNode, WorkflowCanvasEdge> | null>(null)
  const [connectionFeedback, setConnectionFeedback] = useState("")
  const connectionCommittedRef = useRef(false)
  const canvasCallbacks = useMemo<CanvasCallbacks>(() => ({
    onDelete: (nodeID) => onDeleteNodes([nodeID]),
    onDuplicate: onDuplicateNode,
    onLockToggle: onLockNode,
  }), [onDeleteNodes, onDuplicateNode, onLockNode])

  const [canvasNodes, setCanvasNodes] = useState<WorkflowCanvasNode[]>(() => buildCanvasNodes(nodes, selectedNodeID, currentAgentID, canvasCallbacks))
  const [canvasEdges, setCanvasEdges] = useState<WorkflowCanvasEdge[]>(() => buildCanvasEdges(edges, nodes, currentAgentID, selectedEdgeID))

  useEffect(() => {
    const nextNodes = buildCanvasNodes(nodes, selectedNodeID, currentAgentID, canvasCallbacks)
    startTransition(() => setCanvasNodes((current) => mergeCanvasNodes(current, nextNodes)))
  }, [canvasCallbacks, currentAgentID, nodes, selectedNodeID])

  useEffect(() => {
    const nextEdges = buildCanvasEdges(edges, nodes, currentAgentID, selectedEdgeID)
    startTransition(() => setCanvasEdges((current) => mergeCanvasEdges(current, nextEdges)))
  }, [currentAgentID, edges, nodes, selectedEdgeID])

  function validateConnection(connection: Connection | WorkflowCanvasEdge) {
    const sourceNode = nodes.find((node) => node.id === connection.source)
    const targetNode = nodes.find((node) => node.id === connection.target)
    const kind = resolveConnectionKind(sourceNode, targetNode, connection.sourceHandle, connection.targetHandle)
    if (!kind) return false
    if (kind === "control" && connection.source && connection.target && wouldCreateControlCycle(edges, connection.source, connection.target)) return false
    if ((kind === "delegation" || kind === "primary-link") && connection.source && connection.target) {
      const error = validateWorkflowAgentEdge({ nodes, edges }, {
        id: "connection-preview",
        source: connection.source,
        target: connection.target,
        kind,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
      })
      if (error) return false
    }
    return !edges.some(
      (edge) =>
        edge.source === connection.source &&
        edge.target === connection.target &&
        edge.sourceHandle === (connection.sourceHandle ?? undefined) &&
        edge.targetHandle === (connection.targetHandle ?? undefined),
    )
  }

  function connect(connection: Connection) {
    if (!validateConnection(connection) || !connection.source || !connection.target) return
    const sourceNode = nodes.find((node) => node.id === connection.source)
    const targetNode = nodes.find((node) => node.id === connection.target)
    const kind = resolveConnectionKind(sourceNode, targetNode, connection.sourceHandle, connection.targetHandle)
    if (!kind) return
    if ((kind === "delegation" || kind === "primary-link") && connection.source && connection.target) {
      const error = validateWorkflowAgentEdge({ nodes, edges }, {
        id: "connection-preview",
        source: connection.source,
        target: connection.target,
        kind,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
      })
      if (error) {
        setConnectionFeedback(error)
        return
      }
    }
    connectionCommittedRef.current = true
    setConnectionFeedback("")
    onAddEdge({
      id: `edge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
      source: connection.source,
      target: connection.target,
      kind,
      ...(connection.sourceHandle ? { sourceHandle: connection.sourceHandle } : {}),
      ...(connection.targetHandle ? { targetHandle: connection.targetHandle } : {}),
    })
  }

  function handleNodeChanges(changes: NodeChange<WorkflowCanvasNode>[]) {
    setCanvasNodes((current) => applyNodeChanges(changes, current))
    const removed = changes.filter((change) => change.type === "remove").map((change) => change.id)
    if (removed.length) onDeleteNodes(removed)
    const moved = changes.flatMap((change) =>
      change.type === "position" && change.position ? [{ id: change.id, position: change.position }] : [],
    )
    if (moved.length) onMoveNodes(moved)
  }

  function handleEdgeChanges(changes: EdgeChange<WorkflowCanvasEdge>[]) {
    setCanvasEdges((current) => applyEdgeChanges(changes, current))
    const removed = changes.filter((change) => change.type === "remove").map((change) => change.id)
    if (removed.length) onDeleteEdges(removed)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const raw = event.dataTransfer.getData("application/agent-system-workflow-node")
    if (!raw || !instance) return
    try {
      const item = JSON.parse(raw) as WorkflowPaletteItem
      if (item.disabled) return
      onAddNode(item, instance.screenToFlowPosition({ x: event.clientX, y: event.clientY }))
    } catch {
      setConnectionFeedback("無法讀取拖曳的節點資料。")
    }
  }

  return (
    <section aria-label="Workflow 畫布" className="relative min-h-0 min-w-0 overflow-hidden bg-muted/30">
      <ReactFlow<WorkflowCanvasNode, WorkflowCanvasEdge>
        colorMode="light"
        deleteKeyCode={["Backspace", "Delete"]}
        edges={canvasEdges}
        fitView
        fitViewOptions={{ maxZoom: 1, padding: 0.45 }}
        isValidConnection={validateConnection}
        minZoom={0.15}
        nodeTypes={nodeTypes}
        nodes={canvasNodes}
        onConnect={connect}
        onConnectEnd={() => {
          if (!connectionCommittedRef.current) setConnectionFeedback("這組 handle 不相容、已存在，或會形成循環。")
        }}
        onConnectStart={() => {
          connectionCommittedRef.current = false
          setConnectionFeedback("")
        }}
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = "move"
        }}
        onDrop={handleDrop}
        onEdgeClick={(_, edge) => {
          onSelectNode(null)
          onSelectEdge(edge.id)
        }}
        onEdgesChange={handleEdgeChanges}
        onInit={setInstance}
        onNodeClick={(_, node) => {
          onSelectEdge(null)
          onSelectNode(node.id)
        }}
        onNodeDoubleClick={(_, node) => {
          onSelectEdge(null)
          onOpenNodeDetails(node.id)
        }}
        onNodesChange={handleNodeChanges}
        onPaneClick={() => {
          onSelectNode(null)
          onSelectEdge(null)
        }}
        proOptions={{ hideAttribution: true }}
        selectionOnDrag
      >
        <Background color="var(--border)" gap={22} size={1.2} variant={BackgroundVariant.Dots} />
        <Controls aria-label="畫布縮放與檢視控制" position="bottom-left" />
         <MiniMap ariaLabel="Workflow 縮圖" maskColor="color-mix(in srgb, var(--background) 72%, transparent)" nodeColor="var(--muted-foreground)" pannable zoomable />
         <div aria-label="Workflow 連線圖例" className="pointer-events-none absolute right-4 top-4 z-10 grid gap-1.5 rounded-lg border border-border bg-background/88 px-2.5 py-2 text-[10px] text-muted-foreground shadow-sm backdrop-blur-sm">
           <span><i aria-hidden="true" className="workflow-legend-dot workflow-legend-dot--green" />Agent-to-Agent</span>
           <span><i aria-hidden="true" className="workflow-legend-dot workflow-legend-dot--yellow" />目前 Agent capabilities</span>
           <span><i aria-hidden="true" className="workflow-legend-dot workflow-legend-dot--blue" />Command entry</span>
         </div>
        <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-border bg-background/88 px-2.5 py-2 text-muted-foreground text-xs shadow-sm backdrop-blur-sm">
          <MousePointer2Icon aria-hidden="true" className="size-3.5" />
           單擊選取 · 雙擊開啟詳細配置 · 拉動 handle 建立連線
        </div>
      </ReactFlow>
      <p aria-live="polite" className={`workflow-connection-feedback ${connectionFeedback ? "workflow-connection-feedback--visible" : ""}`}>
        <AlertTriangleIcon aria-hidden="true" className="size-4" />
        {connectionFeedback}
      </p>
    </section>
  )
}
