import { WorkflowBuilder } from "@/features/workflows/components/WorkflowBuilder"
import { WORKFLOWS_ROUTE_PATH } from "@/features/workflows/constants"
import "@/features/workflows/workflow.css"

export { WORKFLOWS_ROUTE_PATH }

export function WorkflowsRoute({ onBack, project }: { onBack: () => void; project?: string }) {
  return <WorkflowBuilder key={project ?? "global"} onBack={onBack} project={project} />
}
