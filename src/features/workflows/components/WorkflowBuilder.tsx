import { useEffect, useState } from "react"
import { BracesIcon, Layers2Icon, ListTreeIcon, PanelRightCloseIcon, PlayIcon, PlusIcon, Settings2Icon, XIcon } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/shared/components/ui/dialog"
import { toastManager } from "@/shared/components/ui/toast"
import type { ResourceNodeData, WorkflowEdge, WorkflowNode, WorkflowPaletteItem, WorkflowPosition, WorkflowTarget, WorkflowV1 } from "@/features/workflows/types"
import { createNodeFromPalette, duplicateWorkflowNode, getWorkflowNodeTitle, touchWorkflow } from "@/features/workflows/workflowUtils"
import { useWorkflowBuilder } from "@/features/workflows/hooks/useWorkflowBuilder"
import { WorkflowBrowser } from "@/features/workflows/components/WorkflowBrowser"
import { WorkflowAgentAppPanel } from "@/features/workflows/components/WorkflowAgentAppPanel"
import { WorkflowCanvas } from "@/features/workflows/components/WorkflowCanvas"
import { WorkflowConfirmDialog, type WorkflowRequestedAction } from "@/features/workflows/components/WorkflowConfirmDialog"
import { WorkflowAgentConfigPanel } from "@/features/workflows/components/WorkflowAgentConfigPanel"
import { WorkflowInspector } from "@/features/workflows/components/WorkflowInspector"
import { WorkflowJsonPanel } from "@/features/workflows/components/WorkflowJsonPanel"
import { WorkflowPalette } from "@/features/workflows/components/WorkflowPalette"
import { WorkflowProductNav } from "@/features/workflows/components/WorkflowProductNav"
import { WorkflowPublishReport } from "@/features/workflows/components/WorkflowPublishReport"
import { WorkflowResourceConfigPanel } from "@/features/workflows/components/WorkflowResourceConfigPanels"
import { WorkflowRunPanel } from "@/features/workflows/components/WorkflowRunPanel"
import { WorkflowTopbar } from "@/features/workflows/components/WorkflowTopbar"

type RightTab = "palette" | "apps" | "inspector" | "run" | "json"

const RIGHT_TABS = [
  { id: "palette", label: "節點", icon: PlusIcon },
  { id: "apps", label: "Apps", icon: Layers2Icon },
  { id: "inspector", label: "檢查", icon: Settings2Icon },
  { id: "run", label: "執行", icon: PlayIcon },
  { id: "json", label: "JSON", icon: BracesIcon },
] satisfies Array<{ id: RightTab; label: string; icon: typeof PlusIcon }>

export function WorkflowBuilder({ onBack, project }: { onBack: () => void; project?: string }) {
  const builder = useWorkflowBuilder(project)
  const loadCache = builder.loadCache
  const [selectedNodeID, setSelectedNodeID] = useState<string | null>(null)
  const [selectedEdgeID, setSelectedEdgeID] = useState<string | null>(null)
  const [rightTab, setRightTab] = useState<RightTab>("palette")
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [browserOpen, setBrowserOpen] = useState(false)
  const [requestedAction, setRequestedAction] = useState<WorkflowRequestedAction | null>(null)
  const [publishReportOpen, setPublishReportOpen] = useState(false)
  const [nodeDetailOpen, setNodeDetailOpen] = useState(false)
  const [cacheTarget, setCacheTarget] = useState<WorkflowTarget>("workflow-test")
  const busy = Boolean(builder.busyAction)
  const selectedNode = builder.workflow.nodes.find((node) => node.id === selectedNodeID) ?? null
  const selectedEdge = builder.workflow.edges.find((edge) => edge.id === selectedEdgeID) ?? null
  const selectedAgentNode = isWorkflowAgentNode(selectedNode) ? selectedNode : null
  const selectedResourceNode = selectedNode?.type.startsWith("resource.") ? selectedNode : null
  const polling = builder.run?.status === "queued" || builder.run?.status === "running"

  useEffect(() => {
    if (!selectedNode || !selectedNode.type.startsWith("action.")) return
    const controller = new AbortController()
    void loadCache(selectedNode.id, cacheTarget, controller.signal)
    return () => controller.abort()
  }, [cacheTarget, loadCache, selectedNode])

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
      if (event.key.toLowerCase() === "l" && selectedNodeID) lockNode(selectedNodeID)
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
    builder.updateDraft(updater)
  }

  function addNode(item: WorkflowPaletteItem, position?: WorkflowPosition) {
    if (item.disabled) return
    const fallbackPosition = { x: 310 + (builder.workflow.nodes.length % 3) * 38, y: (builder.workflow.nodes.length % 5 - 2) * 130 }
    const node = createNodeFromPalette(item, position ?? fallbackPosition, builder.workflow.nodes, builder.workflow.scope)
    mutate((workflow) => ({ ...workflow, nodes: [...workflow.nodes, node] }))
    setSelectedNodeID(node.id)
    setSelectedEdgeID(null)
    setRightTab("inspector")
  }

  function addEdge(edge: WorkflowEdge) {
    mutate((workflow) => ({ ...workflow, edges: [...workflow.edges, edge] }))
    setSelectedEdgeID(edge.id)
    setSelectedNodeID(null)
    setRightTab("inspector")
  }

  function moveNodes(positions: Array<{ id: string; position: WorkflowPosition }>) {
    const byID = new Map(positions.map((item) => [item.id, item.position]))
    mutate((workflow) => ({ ...workflow, nodes: workflow.nodes.map((node) => byID.has(node.id) ? { ...node, position: byID.get(node.id) ?? node.position } : node) }))
  }

  function deleteNodes(nodeIDs: string[]) {
    const removed = new Set(nodeIDs)
    mutate((workflow) => ({ ...workflow, nodes: workflow.nodes.filter((node) => !removed.has(node.id)), edges: workflow.edges.filter((edge) => !removed.has(edge.source) && !removed.has(edge.target)) }))
    if (selectedNodeID && removed.has(selectedNodeID)) setSelectedNodeID(null)
  }

  function deleteEdges(edgeIDs: string[]) {
    const removed = new Set(edgeIDs)
    mutate((workflow) => ({ ...workflow, edges: workflow.edges.filter((edge) => !removed.has(edge.id)) }))
    if (selectedEdgeID && removed.has(selectedEdgeID)) setSelectedEdgeID(null)
  }

  function duplicateNode(nodeID: string) {
    const source = builder.workflow.nodes.find((node) => node.id === nodeID)
    if (!source) return
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
    mutate((workflow) => ({
      ...workflow,
      nodes: workflow.nodes.map((node) => node.id === previousID ? nextNode : node),
      edges: workflow.edges.map((edge) => ({ ...edge, source: edge.source === previousID ? nextNode.id : edge.source, target: edge.target === previousID ? nextNode.id : edge.target })),
    }))
    setSelectedNodeID(nextNode.id)
  }

  function updateEdge(nextEdge: WorkflowEdge) {
    mutate((workflow) => ({ ...workflow, edges: workflow.edges.map((edge) => edge.id === nextEdge.id ? nextEdge : edge) }))
  }

  function openNodeDetails(nodeID: string) {
    setSelectedNodeID(nodeID)
    setSelectedEdgeID(null)
    setNodeDetailOpen(true)
  }

  function importDraft(workflow: WorkflowV1) {
    builder.replaceDraft(touchWorkflow(workflow, {}))
    setSelectedNodeID(workflow.nodes[0]?.id ?? null)
    setSelectedEdgeID(null)
    setRightTab("inspector")
  }

  async function confirmAction(action: WorkflowRequestedAction) {
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
        onRequestAction={setRequestedAction}
        onSave={async () => { await builder.save() }}
        persisted={builder.persisted}
        workflow={builder.workflow}
      />
      <WorkflowCanvas
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
           {rightTab === "palette" && <WorkflowPalette catalog={builder.catalog} error={builder.catalogError} loading={builder.catalogLoading} onAdd={(item) => addNode(item)} />}
           {rightTab === "apps" && <WorkflowAgentAppPanel onSelectNode={(nodeID) => { setSelectedNodeID(nodeID); setSelectedEdgeID(null); setRightTab("inspector") }} workflow={builder.workflow} />}
          {rightTab === "inspector" && <WorkflowInspector cacheMetadata={builder.cacheMetadata} edges={builder.workflow.edges} nodes={builder.workflow.nodes} onClearCache={builder.clearCache} onDeleteEdge={(id) => deleteEdges([id])} onDeleteNode={(id) => deleteNodes([id])} onDuplicateNode={duplicateNode} onTargetChange={setCacheTarget} onUpdateEdge={updateEdge} onUpdateNode={updateNode} run={builder.run} selectedEdge={selectedEdge} selectedNode={selectedNode} target={cacheTarget} workflowScope={builder.workflow.scope} />}
          {rightTab === "run" && <WorkflowRunPanel nodes={builder.workflow.nodes} polling={polling} run={builder.run} />}
          {rightTab === "json" && <WorkflowJsonPanel onImport={importDraft} onValidateImport={(workflow, signal) => builder.validateImport(workflow, { signal })} workflow={builder.workflow} />}
        </div>
      </aside>
      {rightPanelOpen && <button aria-label="關閉 Workflow 工具面板" className="workflow-panel-backdrop" onClick={() => setRightPanelOpen(false)} type="button" />}

      <div className="workflow-shortcuts" aria-hidden="true"><ListTreeIcon className="size-3" />Ctrl S 儲存 · Ctrl D 複製 · L 鎖定</div>
      <Button aria-label={rightPanelOpen ? "關閉工具面板" : "開啟工具面板"} className="workflow-panel-toggle" onClick={() => setRightPanelOpen((current) => !current)} size="icon" variant="outline"><PanelRightCloseIcon aria-hidden="true" /></Button>

      <WorkflowBrowser activeWorkflowID={builder.workflow.id} busy={busy} error={builder.libraryError} loading={builder.libraryLoading} onCreate={builder.createNew} onDelete={builder.remove} onLoad={async (summary) => { await builder.load(summary); setSelectedNodeID(null); setSelectedEdgeID(null); setBrowserOpen(false) }} onOpenChange={setBrowserOpen} open={browserOpen} project={project} workflows={builder.workflows} />
      <WorkflowConfirmDialog action={requestedAction} busy={busy} name={builder.workflow.name} onConfirm={confirmAction} onOpenChange={(open) => { if (!open && !busy) setRequestedAction(null) }} scope={builder.workflow.scope} />
      <WorkflowPublishReport onOpenChange={setPublishReportOpen} open={publishReportOpen} report={builder.publishReport} />
       <Dialog onOpenChange={setNodeDetailOpen} open={nodeDetailOpen}>
         <DialogPopup className="max-w-4xl" closeProps={{ "aria-label": "關閉節點詳細配置" }}>
           <DialogHeader>
             <DialogTitle>{selectedNode?.type.startsWith("resource.") ? `${getWorkflowNodeTitle(selectedNode)} 設定` : "節點詳細配置"}</DialogTitle>
             <DialogDescription>{selectedNode ? getWorkflowNodeTitle(selectedNode) : "選取的 Agent App resource"}</DialogDescription>
           </DialogHeader>
           <DialogPanel className="min-h-0 overflow-hidden p-0">
             {selectedAgentNode ? (
               <WorkflowAgentConfigPanel key={selectedAgentNode.id} nodes={builder.workflow.nodes} node={selectedAgentNode} onUpdateNode={updateNode} />
             ) : selectedResourceNode ? (
               <WorkflowResourceConfigPanel key={selectedResourceNode.id} node={selectedResourceNode} onClose={() => setNodeDetailOpen(false)} onUpdateNode={updateNode} project={project} />
               ) : (
                 <div className="max-h-[68vh] overflow-y-auto">
                   <WorkflowInspector cacheMetadata={builder.cacheMetadata} edges={builder.workflow.edges} nodes={builder.workflow.nodes} onClearCache={builder.clearCache} onDeleteEdge={(id) => deleteEdges([id])} onDeleteNode={(id) => { deleteNodes([id]); setNodeDetailOpen(false) }} onDuplicateNode={duplicateNode} onTargetChange={setCacheTarget} onUpdateEdge={updateEdge} onUpdateNode={updateNode} run={builder.run} selectedEdge={null} selectedNode={selectedNode} target={cacheTarget} workflowScope={builder.workflow.scope} />
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

function isWorkflowAgentNode(node: WorkflowNode | null): node is WorkflowNode & { type: "resource.agent"; data: ResourceNodeData } {
  return node?.type === "resource.agent"
}
