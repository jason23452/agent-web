import { useState } from "react"
import { getApiErrorMessage } from "@/shared/api"
import { importSkillArchives, importSkillUrls, type SkillImportResult } from "@/shared/api/opencodeSkills"
import { Dialog, DialogDescription, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/shared/components/ui/dialog"
import { AddSkillForm } from "@/shared/components/layout/app-sidebar/PluginSkillModalSections"
import { emptySkillForm } from "@/shared/components/layout/app-sidebar/config"
import type { InstallResult, SkillForm } from "@/shared/types/app-sidebar"

export type ImportedWorkflowSkill = SkillImportResult["imported"][number]

type WorkflowSkillImportDialogProps = {
  defaultScope: "project" | "global"
  onImported: (skills: ImportedWorkflowSkill[]) => void
  onOpenChange: (open: boolean) => void
  open: boolean
  workspace: string
}

export function WorkflowSkillImportDialog({ defaultScope, onImported, onOpenChange, open, workspace }: WorkflowSkillImportDialogProps) {
  const [form, setForm] = useState<SkillForm>(() => ({ ...emptySkillForm, installTarget: defaultScope }))
  const [installResult, setInstallResult] = useState<InstallResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (loading) return
    const scope = form.installTarget
    const project = scope === "project" ? workspace : undefined
    const headers = workspace.trim() ? { "x-agent-system-workspace": workspace.trim() } : undefined
    setLoading(true)
    setInstallResult(null)
    try {
      const result = form.method === "remote"
        ? await importSkillUrls(
            { scope, ...(project ? { project } : {}), sources: form.sources.split(/\r?\n/).map((source) => source.trim()).filter(Boolean), overwrite: true, restart: false },
            { headers },
          )
        : await importSkillArchives(
            form.archiveFiles,
            { scope, ...(project ? { project } : {}), overwrite: true, restart: false },
            { headers },
          )
      setInstallResult({ status: result.imported.length ? "success" : "error", message: formatImportResult(result) })
      if (result.imported.length) onImported(result.imported)
    } catch (error) {
      setInstallResult({ status: "error", message: getApiErrorMessage(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className="max-h-[calc(100dvh-2rem)] max-w-2xl" closeProps={{ "aria-label": "關閉 Skill 匯入" }}>
        <DialogHeader>
          <DialogTitle>匯入 Skill</DialogTitle>
          <DialogDescription className="mt-1">從網路來源或壓縮檔匯入 Skill，完成後會在目前 Workflow 建立 reference Skill 節點。</DialogDescription>
        </DialogHeader>
        <DialogPanel className="min-h-0 overflow-y-auto p-0">
          <AddSkillForm
            currentProjectName={workspace}
            form={form}
            installResult={installResult}
            loading={loading}
            onCancel={() => onOpenChange(false)}
            onFormChange={setForm}
            onInstallResultChange={setInstallResult}
            onSubmit={() => void submit()}
          />
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  )
}

function formatImportResult(result: SkillImportResult) {
  const imported = result.imported.length ? `已匯入：${result.imported.map((skill) => skill.name).join("、")}` : "沒有匯入 Skill。"
  const skipped = result.skipped.length ? `略過 ${result.skipped.length} 個：${result.skipped.map((item) => `${item.name}（${item.reason}）`).join("、")}` : ""
  const failed = result.failed.length ? `失敗 ${result.failed.length} 個：${result.failed.map((item) => `${item.source}（${item.reason}）`).join("、")}` : ""
  return [imported, skipped, failed].filter(Boolean).join("；")
}
