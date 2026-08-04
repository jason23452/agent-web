import { ExtensionHostPage } from "@/shared/components/layout/context/ExtensionHost"
export { EXTENSION_ROUTE_SEGMENT } from "@/features/extensions/constants"

export function ExtensionRoute({
  extensionId,
  onBack,
  project,
  projectLoading = false,
  projectPath,
}: {
  extensionId: string
  onBack: () => void
  project: string
  projectLoading?: boolean
  projectPath?: string | null
}) {
  return (
    <ExtensionHostPage
      extensionId={extensionId}
      onBack={onBack}
      projectLoading={projectLoading}
      projectName={project}
      projectPath={projectPath}
    />
  )
}
