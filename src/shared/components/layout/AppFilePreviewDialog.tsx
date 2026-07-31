import {
  BotIcon,
  CheckIcon,
  Code2Icon,
  FileIcon,
  PaperclipIcon,
  PenLineIcon,
  PinIcon,
  RotateCcwIcon,
  SendIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"
import { type ChangeEvent, useEffect, useRef, useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/shared/components/ui/dialog"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/shared/components/ui/tabs"
import { Skeleton } from "@/shared/components/ui/skeleton"
import type { FileNode, PinContext } from "@/shared/types/workspace"
import { cn } from "@/shared/utils/cn"

type AppFilePreviewFile = FileNode
type AppFilePreviewPinContext = PinContext

type AppFilePreviewDialogProps = {
  file: AppFilePreviewFile | null
  onClose: () => void
  onPin: (context: AppFilePreviewPinContext) => void
  onLibraryUpload?: () => void
  onLocalUpload?: (file: File) => void
}

type WorkTab = "edit" | "agent"

type SelectionPin = AppFilePreviewPinContext & {
  left: number
  top: number
}

type SelectionLineRange = {
  start: number
  end: number
}

function getFileSample(file: AppFilePreviewFile) {
  if (file.type === "html") {
    return '<!doctype html>\n<html lang="zh-Hant">\n  <head>\n    <meta charset="UTF-8" />\n    <title>AICaht</title>\n  </head>\n  <body>\n    <div id="app"></div>\n  </body>\n</html>'
  }

  if (file.type === "css") {
    return ":root {\n  --bg: oklch(97.6% 0 0);\n  --surface: oklch(100% 0 0);\n  --fg: oklch(17% 0 0);\n}\n\nbody {\n  background: var(--bg);\n  color: var(--fg);\n}"
  }

  if (file.type === "ts" || file.type === "tsx") {
    return 'import { defineConfig } from "vite"\nimport react from "@vitejs/plugin-react"\n\nexport default defineConfig({\n  plugins: [react()],\n  server: { port: 5173 },\n})'
  }

  if (file.type === "md") {
    return "# AICaht OpenCode Agent\n\n## 專案概觀\n\n- 多輪對話與串流回覆\n- 專案檔案樹瀏覽\n- 工具呼叫即時反饋"
  }

  if (file.type === "json") {
    return '{\n  "name": "aicaht-agent",\n  "private": true,\n  "type": "module"\n}'
  }

  return `/* ${file.name} */\n此檔案可在預覽中檢視，也可以交給 Agent 或手動編輯。`
}

function getFilePreviewContent(file: AppFilePreviewFile) {
  if (file.contentType === "binary") {
    return `/* ${file.name} */\n此為二進位檔案，無法直接以文字預覽。`
  }

  return file.content ?? getFileSample(file)
}

function summarizeText(text: string, limit = 240) {
  const compact = text.replace(/\s+/g, " ").trim()
  return compact.length > limit ? `${compact.slice(0, limit)}...` : compact
}

export function AppFilePreviewDialog({
  file,
  onClose,
  onPin,
  onLibraryUpload,
  onLocalUpload,
}: AppFilePreviewDialogProps) {
  if (!file) return null

  return (
    <AppFilePreviewDialogContent
      file={file}
      key={file.id}
      onClose={onClose}
      onPin={onPin}
      onLibraryUpload={onLibraryUpload}
      onLocalUpload={onLocalUpload}
    />
  )
}

function AppFilePreviewDialogContent({
  file,
  onClose,
  onPin,
  onLibraryUpload,
  onLocalUpload,
}: {
  file: AppFilePreviewFile
  onClose: () => void
  onPin: (context: AppFilePreviewPinContext) => void
  onLibraryUpload?: () => void
  onLocalUpload?: (file: File) => void
}) {
  const isLoadingContent = file.contentLoading
  const hasContentError = Boolean(file.contentError)
  const initialContent = getFilePreviewContent(file)
  const [activeTab, setActiveTab] = useState<WorkTab>("agent")
  const [savedContent, setSavedContent] = useState(initialContent)
  const [draftContent, setDraftContent] = useState(initialContent)
  const [prompt, setPrompt] = useState("")
  const [response, setResponse] = useState("")
  const [editStatus, setEditStatus] = useState("未修改")
  const [selectionPin, setSelectionPin] = useState<SelectionPin | null>(null)
  const [dialogPins, setDialogPins] = useState<AppFilePreviewPinContext[]>([])
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [selectionLineRange, setSelectionLineRange] = useState<SelectionLineRange | null>(null)
  const previewSectionRef = useRef<HTMLElement>(null)
  const previewCodeRef = useRef<HTMLPreElement>(null)
  const attachMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const nextContent = getFilePreviewContent(file)

    setSavedContent(nextContent)
    setDraftContent(nextContent)
    setEditStatus("未修改")
    setSelectionPin(null)
    setSelectionLineRange(null)
    setDialogPins([])
  }, [file.id, file.content, file.contentType, file.contentError])

  const metadata = [file.size, file.date, file.type.toUpperCase()].filter(Boolean).join(" · ")
  const metadataText = metadata || file.type.toUpperCase()
  const lines = savedContent.split("\n")
  const draftChanged = draftContent !== savedContent

  function handleLibraryUpload() {
    onLibraryUpload?.()
    setPrompt((current) => current || "請參考檔案庫中的相關資料，協助修改這個檔案。")
    setAttachMenuOpen(false)
  }

  function handleLocalUpload() {
    setAttachMenuOpen(false)
    fileInputRef.current?.click()
  }

  function handleLocalUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const pickedFile = event.target.files?.[0] ?? null
    if (!pickedFile) {
      event.target.value = ""
      return
    }

    onLocalUpload?.(pickedFile)
    setPrompt((current) => current || `請參考 ${pickedFile.name}，並協助修改 ${file.name}。`)
    event.target.value = ""
    setAttachMenuOpen(false)
  }

  function saveDraft() {
    setSavedContent(draftContent)
    setEditStatus("已套用到預覽")
    setSelectionPin(null)
    setSelectionLineRange(null)
  }

  function resetDraft() {
    setDraftContent(savedContent)
    setEditStatus("已還原草稿")
  }

  function submitAgentPrompt() {
    if (!prompt.trim()) return

    const contextText = dialogPins.length > 0 ? `目前鎖定 ${dialogPins.map((pin) => pin.meta).join("、")} 作為修改範圍。` : "目前會依整份檔案判斷修改範圍。"
    setResponse(`Agent 已讀取 ${file.name}。${contextText} 建議先縮小變更範圍，保留既有結構，再針對命名、重複邏輯與可讀性提出可套用的修改。`)
    setPrompt("")
  }

  function applyAgentSuggestion() {
    const note = dialogPins.length > 0 ? `\n\n/* Agent note: 已針對 ${dialogPins.map((pin) => pin.meta).join("、")} 產生修改建議。 */` : "\n\n/* Agent note: 已產生整份檔案的修改建議。 */"
    setDraftContent((current) => `${current}${note}`)
    setEditStatus("Agent 建議已加入草稿")
    setActiveTab("edit")
  }

  function updateSelectionPin() {
    const selection = window.getSelection()
    const codePreview = previewCodeRef.current
    const previewSection = previewSectionRef.current

    if (!selection || selection.isCollapsed || !selection.rangeCount || !codePreview || !previewSection) {
      setSelectionPin(null)
      setSelectionLineRange(null)
      return
    }

    const range = selection.getRangeAt(0)
    if (!codePreview.contains(range.commonAncestorContainer)) {
      setSelectionPin(null)
      setSelectionLineRange(null)
      return
    }

    const text = selection.toString().trim()
    if (!text) {
      setSelectionPin(null)
      setSelectionLineRange(null)
      return
    }

    const lineElements = Array.from(codePreview.querySelectorAll<HTMLElement>("[data-line]"))
    const startLine = lineElements.find((element) => element.contains(range.startContainer))?.dataset.line ?? "1"
    const endLine = lineElements.find((element) => element.contains(range.endContainer))?.dataset.line ?? startLine
    const startLineNumber = Number.parseInt(startLine, 10)
    const endLineNumber = Number.parseInt(endLine, 10)
    const normalizedStartLine = Number.isNaN(startLineNumber) ? 1 : startLineNumber
    const normalizedEndLine = Number.isNaN(endLineNumber) ? normalizedStartLine : endLineNumber
    const lineLabel = startLine === endLine ? `L${startLine}` : `L${startLine}-${endLine}`
    const rangeRect = range.getBoundingClientRect()
    const sectionRect = previewSection.getBoundingClientRect()

    setSelectionPin({
      label: file.name,
      meta: lineLabel,
      text: summarizeText(text, 180),
      left: Math.max(8, Math.min(rangeRect.left - sectionRect.left, sectionRect.width - 156)),
      top: Math.max(42, rangeRect.top - sectionRect.top - 38),
    })
    setSelectionLineRange({
      start: Math.min(normalizedStartLine, normalizedEndLine),
      end: Math.max(normalizedStartLine, normalizedEndLine),
    })
  }

  useEffect(() => {
    if (!attachMenuOpen) return

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node | null
      if (!attachMenuRef.current || !target) return

      if (!attachMenuRef.current.contains(target)) {
        setAttachMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [attachMenuOpen])

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogPopup className="max-h-[min(92dvh,860px)] max-w-[1080px] overflow-hidden" closeProps={{ "aria-label": "關閉檔案預覽" }}>
        <DialogHeader className="border-border/70 border-b bg-background pb-3">
          <div className="flex min-w-0 items-start gap-3 pr-10">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg border bg-muted/35 text-muted-foreground">
              <FileIcon aria-hidden="true" className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-lg">{file.name}</DialogTitle>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 font-mono text-muted-foreground text-xs">
                <span className="truncate">./{file.name}</span>
                <span aria-hidden="true">·</span>
                <span>{metadataText}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <DialogPanel className="bg-background p-4 sm:p-5">
          <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <section
              aria-label="檔案內容預覽"
              className="relative grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border bg-[#1f1f1f] text-[#d4d4d4] shadow-sm/5"
              onKeyUp={updateSelectionPin}
              onMouseUp={updateSelectionPin}
              ref={previewSectionRef}
            >
              <div className="flex min-h-10 items-center justify-between gap-3 border-white/10 border-b bg-[#252526] px-4 py-2 text-white/70">
                <div className="flex min-w-0 items-center gap-2">
                  <span aria-hidden="true" className="size-2.5 rounded-full bg-[#ff5f57]" />
                  <span aria-hidden="true" className="size-2.5 rounded-full bg-[#ffbd2e]" />
                  <span aria-hidden="true" className="size-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-2 min-w-0 truncate font-mono text-xs">./{file.name}</span>
                </div>
                <span className="hidden text-white/45 text-xs sm:inline-flex">選取文字可指定給 Agent</span>
              </div>

              {selectionPin && (
                <button
                  className="absolute z-10 inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 font-medium text-primary-foreground text-xs shadow-[0_4px_20px_rgb(0_0_0_/_28%)] transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => {
                    const nextPin = {
                      label: selectionPin.label,
                      meta: selectionPin.meta,
                      text: selectionPin.text,
                    }

                    onPin(nextPin)
                    setDialogPins((current) => {
                      const alreadyPinned = current.some((pin) => pin.meta === nextPin.meta && pin.text === nextPin.text)
                      return alreadyPinned ? current : [...current, nextPin]
                    })
                    setSelectionPin(null)
                    setSelectionLineRange(null)
                    setActiveTab("agent")
                    window.getSelection()?.removeAllRanges()
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  style={{ left: selectionPin.left, top: selectionPin.top }}
                  type="button"
                >
                  <PinIcon aria-hidden="true" className="size-3.5" />
                  Pin 到 Agent
                </button>
              )}

              {isLoadingContent ? (
                <div className="grid min-h-72 gap-3 overflow-hidden p-4">
                  <div className="mb-1 flex items-center gap-3 border-b border-white/10 pb-3">
                    <Skeleton className="h-4 w-24 bg-white/20" />
                    <Skeleton className="h-4 w-16 bg-white/20" />
                  </div>

                  {Array.from({ length: 28 }).map((_, index) => {
                    const widthClass =
                      index % 4 === 0
                        ? "w-[92%]"
                        : index % 4 === 1
                          ? "w-[78%]"
                          : index % 4 === 2
                            ? "w-[84%]"
                            : "w-[72%]"

                    return <Skeleton key={`preview-skeleton-${index}`} className={`${widthClass} h-4 bg-white/20`} />
                  })}
                </div>
              ) : hasContentError ? (
                <pre className="h-[min(62vh,560px)] min-h-72 overflow-auto rounded-none border border-destructive/60 bg-destructive/10 p-4 font-mono text-[#fca5a5] text-xs leading-6">
                  {file.contentError}
                </pre>
              ) : file.type === "img" ? (
                <div className="grid min-h-72 place-items-center gap-2 p-6 text-center text-sm text-white/70">
                  <FileIcon aria-hidden="true" className="size-9 opacity-50" />
                  <span>圖片預覽：{file.name}</span>
                </div>
              ) : file.contentType === "binary" ? (
                <div className="grid min-h-72 place-items-center gap-2 p-6 text-center text-sm text-white/70">
                  <FileIcon aria-hidden="true" className="size-9 opacity-50" />
                  <span>目前為二進位檔案，無法以純文字方式預覽。</span>
                </div>
              ) : (
                <pre
                  className="h-[min(62vh,560px)] min-h-72 overflow-auto p-4 font-mono text-xs leading-6 selection:bg-sky-400/55 selection:text-white"
                  onScroll={() => {
                    setSelectionPin(null)
                    setSelectionLineRange(null)
                  }}
                  ref={previewCodeRef}
                >
                  {lines.map((line, index) => {
                    const lineNumber = index + 1
                    const isLineSelected =
                      selectionLineRange !== null &&
                      lineNumber >= selectionLineRange.start &&
                      lineNumber <= selectionLineRange.end

                    return (
                      <span
                        className={cn(
                          "grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 rounded-sm border border-transparent hover:bg-white/[0.03]",
                          isLineSelected ? "border-sky-300/35 bg-sky-400/15" : "",
                        )}
                        data-line={index + 1}
                        key={`${file.id}-${index}`}
                      >
                        <span className={cn("select-none text-right", isLineSelected ? "text-sky-200" : "text-white/30")}>{lineNumber}</span>
                        <span className={cn("whitespace-pre-wrap break-all", isLineSelected && "text-white")}>{line || " "}</span>
                      </span>
                    )
                  })}
                </pre>
              )}
            </section>

            <Tabs className="min-h-0 rounded-lg border bg-muted/25 p-3" onValueChange={(value) => setActiveTab(value as WorkTab)} value={activeTab}>
              <TabsList className="w-full">
                <TabsTab className="flex-1" value="agent">
                  <BotIcon aria-hidden="true" />
                  Agent 修改
                </TabsTab>
                <TabsTab className="flex-1" value="edit">
                  <PenLineIcon aria-hidden="true" />
                  手動編輯
                </TabsTab>
              </TabsList>

              <TabsPanel className="min-h-0 pt-2" value="agent">
                <section aria-label="使用 Agent 修改檔案" className="grid gap-4">
                  {response && (
                    <div className="grid gap-3 rounded-lg border border-info/20 bg-info/5 p-3 text-sm leading-6">
                      <div className="flex items-center gap-2 font-semibold text-info-foreground">
                        <Code2Icon aria-hidden="true" className="size-4" />
                        建議修改
                      </div>
                      <p>{response}</p>
                      <div>
                        <Button onClick={applyAgentSuggestion} size="sm" variant="outline">
                          <PenLineIcon aria-hidden="true" />
                          套用到編輯草稿
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-2">
                    <label className="font-semibold text-sm" htmlFor="fileAgentPrompt">
                      修改指令
                    </label>
                    <div className="rounded-lg border bg-background transition focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring">
                      {dialogPins.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 px-3 pt-3">
                          {dialogPins.map((pin, index) => (
                            <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-muted px-2 py-1 text-xs" key={`${pin.meta}-${index}-${pin.text}`} title={pin.text}>
                              <PinIcon aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />
                              <span className="min-w-0 truncate font-semibold">{pin.label}</span>
                              <span className="shrink-0 font-mono text-muted-foreground text-[10px]">{pin.meta}</span>
                              <button
                                aria-label={`移除 Agent 選取範圍 ${pin.meta}`}
                                className="-mr-1 grid size-5 shrink-0 place-items-center rounded-sm text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                onClick={() => setDialogPins((current) => current.filter((_, pinIndex) => pinIndex !== index))}
                                type="button"
                              >
                                <XIcon aria-hidden="true" className="size-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    <textarea
                      aria-label={`請 Agent 修改 ${file.name}`}
                      className={cn(
                        "min-h-[124px] max-h-[240px] w-full resize-none overflow-auto border-0 bg-transparent px-4 pb-3 text-sm leading-6 outline-none placeholder:text-muted-foreground/70",
                        dialogPins.length > 0 ? "pt-2" : "pt-3",
                      )}
                      id="fileAgentPrompt"
                      onChange={(event) => setPrompt(event.target.value)}
                      placeholder="例如：找出這份檔案可改善的地方，並直接給出可套用的修改。"
                      rows={5}
                      value={prompt}
                    />
                    </div>
                  </div>

                  <div className="relative flex flex-wrap items-center justify-between gap-3 border-border/70 border-t pt-3" ref={attachMenuRef}>
                    <Button onClick={() => setAttachMenuOpen((current) => !current)} size="sm" variant="outline">
                      <PaperclipIcon aria-hidden="true" />
                      附加參考
                    </Button>

                    <Button disabled={!prompt.trim()} onClick={submitAgentPrompt} size="sm">
                      執行修改
                      <SendIcon aria-hidden="true" />
                    </Button>

                    {attachMenuOpen && (
                      <div className="absolute bottom-full left-0 z-20 mb-2 grid w-[234px] gap-1 rounded-lg border bg-popover p-1.5 text-left text-sm text-popover-foreground shadow-[0_16px_44px_rgb(0_0_0_/_18%)]">
                        <button
                          className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={handleLibraryUpload}
                          type="button"
                        >
                          <UploadIcon aria-hidden="true" className="mt-0.5 size-4 text-muted-foreground" />
                          <span className="grid min-w-0 gap-0.5 leading-none">
                            <strong className="truncate font-semibold leading-5">從檔案庫選取</strong>
                            <span className="text-muted-foreground text-xs leading-5">引用專案其他檔案作為參考。</span>
                          </span>
                        </button>
                        <button
                          className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={handleLocalUpload}
                          type="button"
                        >
                          <PaperclipIcon aria-hidden="true" className="mt-0.5 size-4 text-muted-foreground" />
                          <span className="grid min-w-0 gap-0.5 leading-none">
                            <strong className="truncate font-semibold leading-5">上傳本機檔案</strong>
                            <span className="text-muted-foreground text-xs leading-5">加入額外文件或截圖。</span>
                          </span>
                        </button>
                      </div>
                    )}

                    <input
                      accept="*/*"
                      className="sr-only"
                      onChange={handleLocalUploadChange}
                      ref={fileInputRef}
                      type="file"
                    />
                  </div>
                </section>
              </TabsPanel>

              <TabsPanel className="min-h-0 pt-2" value="edit">
                <section aria-label="手動編輯檔案" className="grid gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm">直接修改內容</h3>
                      <p className="mt-1 text-muted-foreground text-xs">套用後會同步更新左側預覽。</p>
                    </div>
                    <span className={cn("rounded-md px-2 py-1 text-xs", draftChanged ? "bg-warning/10 text-warning-foreground" : "bg-success/10 text-success-foreground")}>
                      {draftChanged ? "尚未套用" : editStatus}
                    </span>
                  </div>

                  <textarea
                    aria-label={`手動編輯 ${file.name}`}
                    className="h-[min(52vh,460px)] min-h-72 w-full resize-none overflow-auto rounded-lg border bg-background px-4 py-3 font-mono text-sm leading-6 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-ring"
                    onChange={(event) => {
                      setDraftContent(event.target.value)
                      setEditStatus("草稿修改中")
                    }}
                    spellCheck={false}
                    value={draftContent}
                  />

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button disabled={!draftChanged} onClick={resetDraft} size="sm" variant="outline">
                      <RotateCcwIcon aria-hidden="true" />
                      還原
                    </Button>
                    <Button disabled={!draftChanged} onClick={saveDraft} size="sm">
                      <CheckIcon aria-hidden="true" />
                      套用到預覽
                    </Button>
                  </div>
                </section>
              </TabsPanel>
            </Tabs>
          </div>
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  )
}
