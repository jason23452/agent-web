import { FileTextIcon, ImageIcon, MicIcon, PaperclipIcon, SendIcon, UploadIcon, XIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { ThinkingVariantSwitcher } from "@/shared/components/layout/context/ThinkingVariantSwitcher"
import { Button } from "@/shared/components/ui/button"
import type { Attachment, PinContext, ThinkingVariantOption } from "@/shared/types/workspace"

type ChatComposerProps = {
  attachments: Attachment[]
  onClearPin: () => void
  onRemoveAttachment: (id: string) => void
  onSubmit: (text: string, attachments: Attachment[], pinContext: PinContext | null) => Promise<boolean> | boolean
  onUploadFiles: (files: readonly File[]) => Promise<void>
  onThinkingVariantChange?: (variantKey: string) => void
  pinContext: PinContext | null
  sending?: boolean
  selectedThinkingVariant?: string
  thinkingVariants?: ThinkingVariantOption[]
}

export function ChatComposer({
  attachments,
  onClearPin,
  onRemoveAttachment,
  onSubmit,
  onUploadFiles,
  onThinkingVariantChange,
  pinContext,
  selectedThinkingVariant = "default",
  thinkingVariants = [],
  sending = false,
}: ChatComposerProps) {
  const [value, setValue] = useState("")
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`
  }, [value])

  return (
    <form
      className="bg-[linear-gradient(to_top,var(--background)_78%,transparent)] px-[clamp(18px,5vw,64px)] pb-6 pt-3.5"
      onSubmit={(event) => {
        event.preventDefault()
        if ((!value.trim() && !pinContext) || sending) return
        void Promise.resolve(onSubmit(value, attachments, pinContext)).then((submitted) => {
          if (submitted !== false) setValue("")
        })
      }}
    >
      <div className="mx-auto grid max-w-[820px] gap-2">
        <div className="flex flex-col gap-0 rounded-[26px] border border-border bg-background py-2 pr-2 pl-3.5 shadow-[0_14px_40px_color-mix(in_oklch,var(--foreground)_10%,transparent)] transition-colors focus-within:border-[color-mix(in_oklch,var(--primary)_35%,var(--border))] max-[760px]:rounded-[22px]">
          {pinContext && (
            <div className="grid overflow-hidden pb-2.5 transition-[grid-template-rows] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] [grid-template-rows:1fr]">
              <div className="flex min-h-0 min-w-0 items-start gap-2 overflow-hidden rounded-[10px] border border-primary/15 bg-primary/5 px-2.5 py-2">
                <div className="mt-px grid size-5 shrink-0 place-items-center rounded-[5px] bg-primary/10 text-primary">
                  <PaperclipIcon aria-hidden="true" className="size-3" />
                </div>
                <div className="grid min-w-0 flex-1 gap-[3px]">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-semibold text-[11px]">{pinContext.label}</span>
                    <span className="shrink-0 font-mono text-muted-foreground text-[10px]">{pinContext.meta}</span>
                  </div>
                  <p className="truncate text-xs leading-5 text-foreground/80">{pinContext.text}</p>
                </div>
                <button aria-label="移除 Pin" className="mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-md text-muted-foreground/70 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onClearPin} type="button">
                  <XIcon aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>
          )}

          {attachments.length > 0 && (
            <div className="flex min-h-0 flex-wrap gap-1.5 pb-2" aria-label="已附加檔案">
              {attachments.map((attachment) => (
                <div className="inline-flex max-w-56 items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs leading-none transition-colors hover:bg-muted/80" key={attachment.id}>
                  {attachment.isImage ? <ImageIcon aria-hidden="true" className="size-3.5 text-primary" /> : <FileTextIcon aria-hidden="true" className="size-3.5 text-muted-foreground" />}
                  <span className="truncate font-medium">{attachment.name}</span>
                  <span className="shrink-0 font-mono text-muted-foreground text-[10px]">{attachment.meta}</span>
                  <button aria-label={`移除 ${attachment.name}`} className="grid size-[18px] place-items-center rounded-full text-muted-foreground/70 hover:bg-destructive hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onRemoveAttachment(attachment.id)} type="button">
                    <XIcon aria-hidden="true" className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex min-w-0 items-end gap-2">
            <span className="relative grid size-10 shrink-0 place-items-center self-end">
              <Button aria-label="加入檔案" className="grid size-10 min-h-10 min-w-10 place-items-center rounded-full border-0 bg-transparent p-0 shadow-none before:hidden hover:bg-muted [&_svg]:mx-0 [&_svg]:size-5" onClick={() => setUploadOpen((current) => !current)} size="icon" variant="ghost">
                <PaperclipIcon aria-hidden="true" />
              </Button>
              {uploadOpen && (
                <div className="absolute bottom-[calc(100%+0.5rem)] left-0 z-20 grid w-[234px] gap-1 rounded-lg border bg-popover p-1.5 text-left text-sm text-popover-foreground shadow-[0_14px_40px_color-mix(in_oklch,var(--foreground)_10%,transparent)]">
                  <button
                    className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      setUploadError(null)
                      fileInputRef.current?.click()
                      setUploadOpen(false)
                    }}
                    type="button"
                  >
                    <UploadIcon aria-hidden="true" className="mt-0.5 size-4 text-muted-foreground" />
                    <span className="grid min-w-0 gap-0.5 leading-none">
                      <strong className="truncate font-semibold leading-5">上傳至專案</strong>
                      <span className="text-muted-foreground text-xs leading-5">將檔案寫入目前專案並附加到訊息。</span>
                    </span>
                  </button>
                  <button
                    className="grid w-full grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      setUploadError(null)
                      fileInputRef.current?.click()
                      setUploadOpen(false)
                    }}
                    type="button"
                  >
                    <PaperclipIcon aria-hidden="true" className="mt-0.5 size-4 text-muted-foreground" />
                    <span className="grid min-w-0 gap-0.5 leading-none">
                      <strong className="truncate font-semibold leading-5">選擇本機檔案</strong>
                      <span className="text-muted-foreground text-xs leading-5">加入額外文件或截圖。</span>
                    </span>
                  </button>
                </div>
              )}
            </span>

            <input
              accept="*/*"
              className="hidden"
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                event.target.value = ""
                if (files.length === 0) return

                void onUploadFiles(files).catch((error: unknown) => {
                  setUploadError(error instanceof Error ? error.message : "上傳檔案失敗")
                })
              }}
              ref={fileInputRef}
              type="file"
            />

            <textarea
              aria-label="詢問 AICaht"
              className="min-h-11 max-h-[140px] min-w-0 flex-1 resize-none overflow-y-auto whitespace-pre-wrap break-words border-0 bg-transparent px-1 py-[11px] leading-[1.45] text-foreground outline-none placeholder:text-muted-foreground/70"
              onChange={(event) => setValue(event.target.value)}
              placeholder="詢問 AICaht，或請 opencode-agent 開始工作"
              ref={textareaRef}
              rows={1}
              value={value}
            />
            {onThinkingVariantChange && thinkingVariants.length > 0 && (
              <div className="flex shrink-0 items-center self-end pb-1.5">
                <ThinkingVariantSwitcher
                  activeVariantKey={selectedThinkingVariant}
                  onVariantChange={onThinkingVariantChange}
                  variants={thinkingVariants}
                />
              </div>
            )}
            <div className="flex shrink-0 items-center gap-1 self-end">
              <Button aria-label="語音輸入" className="size-10 min-h-10 min-w-10 rounded-full border-0 bg-transparent shadow-none before:hidden hover:bg-muted" size="icon" variant="ghost">
                <MicIcon aria-hidden="true" />
              </Button>
              <Button aria-label="送出訊息" className="size-11 min-h-11 min-w-11 rounded-full border-primary bg-primary text-primary-foreground shadow-none before:hidden hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-35" disabled={(!value.trim() && !pinContext) || sending} loading={sending} size="icon" type="submit">
                <SendIcon aria-hidden="true" />
              </Button>
            </div>
          </div>
          
        </div>
        {uploadError ? <p className="text-center text-destructive text-xs">{uploadError}</p> : <p className="text-center text-muted-foreground text-xs">訊息會送至目前專案的 OpenCode session。</p>}
      </div>
    </form>
  )
}
