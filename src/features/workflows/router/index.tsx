import { WorkflowBuilder } from "@/features/workflows/components/WorkflowBuilder"
import { WORKFLOWS_ROUTE_PATH } from "@/features/workflows/constants"
import type { ModelOption } from "@/shared/types/workspace"
import "@/features/workflows/workflow.css"

export { WORKFLOWS_ROUTE_PATH }

export function WorkflowsRoute({ modelOptions = [], onBack, project }: { modelOptions?: ModelOption[]; onBack: () => void; project: string }) {
  return <WorkflowBuilder key={project ?? "global"} modelOptions={modelOptions} onBack={onBack} project={project} />
}
