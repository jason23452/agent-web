import { BotIcon, ChevronDownIcon, CommandIcon, FileTextIcon, ImageIcon, MicIcon, PaperclipIcon, SendIcon, Settings2Icon, UploadIcon, XIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { ModelSwitcher } from "@/shared/components/layout/app/ModelSwitcher"
import { ThinkingVariantSwitcher } from "@/shared/components/layout/context/ThinkingVariantSwitcher"
import { Button } from "@/shared/components/ui/button"
import type { Attachment, ModelOption, PinContext, ThinkingVariantOption } from "@/shared/types/workspace"

export type ChatComposerCompletionOption = {
  description?: string
  name: string
}

type CompletionKind = "command" | "subagent"

type CompletionContext = {
  end: number
  kind: CompletionKind
  query: string
  start: number
}

function getCompletionContext(value: string, cursor: number): CompletionContext | null {
  const match = /(^|\s)([/@])([^\s]*)$/.exec(value.slice(0, cursor))
  if (!match || match.index === undefined) return null

  const prefix = match[1] ?? ""
  const trigger = match[2]
  return {
    end: cursor,
    kind: trigger === "/" ? "command" : "subagent",
    query: match[3] ?? "",
    start: match.index + prefix.length,
  }
}

function filterCompletionOptions(options: ChatComposerCompletionOption[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const seen = new Set<string>()
  return options.filter((option) => {
    const normalizedName = option.name.toLocaleLowerCase()
    if (seen.has(normalizedName)) return false
    seen.add(normalizedName)
    if (!normalizedQuery) return true
    return normalizedName.includes(normalizedQuery) || option.description?.toLocaleLowerCase().includes(normalizedQuery)
  }).slice(0, 50)
}

type ChatComposerProps = {
  attachments: Attachment[]
  commands?: ChatComposerCompletionOption[]
  commandLabel?: string
  disabled?: boolean
  hint?: string
  modelLoading?: boolean
  modelLabel?: string
  modelOptions?: ModelOption[]
  onClearPin: () => void
  onRemoveAttachment: (id: string) => void
  onSubmit: (text: string, attachments: Attachment[], pinContext: PinContext | null) => Promise<boolean> | boolean
  onUploadFiles: (files: readonly File[]) => Promise<void>
  onThinkingVariantChange?: (variantKey: string) => void
  onModelChange?: (modelKey: string) => void
  pinContext: PinContext | null
  placeholder?: string
  selectedModelKey?: string | null
  subagents?: ChatComposerCompletionOption[]
  sending?: boolean
  selectedThinkingVariant?: string
  thinkingVariants?: ThinkingVariantOption[]
}

export function ChatComposer({
  attachments,
  commands = [],
  commandLabel,
  disabled = false,
  hint = "訊息會送至目前專案的 OpenCode session。",
  modelLoading = false,
  modelLabel,
  modelOptions,
  onClearPin,
  onRemoveAttachment,
  onSubmit,
  onUploadFiles,
  onThinkingVariantChange,
  onModelChange,
  pinContext,
  placeholder = "詢問 AICaht，或請 opencode-agent 開始工作",
  selectedModelKey,
  subagents = [],
  selectedThinkingVariant = "default",
  thinkingVariants = [],
  sending = false,
}: ChatComposerProps) {
  const [value, setValue] = useState("")
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [completionContext, setCompletionContext] = useState<CompletionContext | null>(null)
  const [completionIndex, setCompletionIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const completionOptions = completionContext
    ? filterCompletionOptions(completionContext.kind === "command" ? commands : subagents, completionContext.query)
    : []

  function updateCompletion(nextValue: string, cursor: number) {
    const nextContext = getCompletionContext(nextValue, cursor)
    setCompletionContext(nextContext)
    setCompletionIndex(0)
  }

  function applyCompletion(option: ChatComposerCompletionOption) {
    if (!completionContext) return
    const trigger = completionContext.kind === "command" ? "/" : "@"
    const replacement = `${trigger}${option.name} `
    const nextValue = `${value.slice(0, completionContext.start)}${replacement}${value.slice(completionContext.end)}`
    const nextCursor = completionContext.start + replacement.length
    setValue(nextValue)
    setCompletionContext(null)
    setCompletionIndex(0)
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor)
    })
  }

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
        if ((!value.trim() && !pinContext) || sending || disabled) return
        void Promise.resolve(onSubmit(value, attachments, pinContext)).then((submitted) => {
          if (submitted !== false) setValue("")
        })
      }}
    >
      <div className="mx-auto grid max-w-[820px] gap-2">
        <div className="relative flex flex-col gap-0 rounded-[26px] border border-border bg-background py-2 pr-2 pl-3.5 shadow-[0_14px_40px_color-mix(in_oklch,var(--foreground)_10%,transparent)] transition-colors focus-within:border-[color-mix(in_oklch,var(--primary)_35%,var(--border))] max-[760px]:rounded-[22px]">
          {completionOptions.length > 0 && completionContext && (
            <div aria-label={completionContext.kind === "command" ? "可用 Command" : "可用 subagent"} className="absolute inset-x-0 bottom-[calc(100%+0.65rem)] z-30 max-h-72 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-[0_14px_40px_color-mix(in_oklch,var(--foreground)_12%,transparent)]" id="chat-composer-completions" role="listbox">
              {completionOptions.map((option, index) => (
                <button
                  aria-selected={index === completionIndex}
                  className={`flex min-h-9 w-full min-w-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${index === completionIndex ? "bg-muted" : "hover:bg-accent"}`}
                  key={`${completionContext.kind}-${option.name}`}
                  onClick={() => applyCompletion(option)}
                  onMouseDown={(event) => event.preventDefault()}
                  role="option"
                  type="button"
                >
                  <span className={`grid size-5 shrink-0 place-items-center rounded-md ${completionContext.kind === "command" ? "text-foreground" : "text-violet-500"}`}>
                    {completionContext.kind === "command" ? <CommandIcon aria-hidden="true" className="size-3.5" /> : <BotIcon aria-hidden="true" className="size-3.5" />}
                  </span>
                  <span className="min-w-0 truncate">
                    <strong className="font-medium text-foreground">{completionContext.kind === "command" ? "/" : "@"}{option.name}</strong>
                    {option.description && <span className="ml-2 text-muted-foreground">{option.description}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
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
              <Button aria-label="加入檔案" className="grid size-10 min-h-10 min-w-10 place-items-center rounded-full border-0 bg-transparent p-0 shadow-none before:hidden hover:bg-muted [&_svg]:mx-0 [&_svg]:size-5" disabled={disabled} onClick={() => setUploadOpen((current) => !current)} size="icon" variant="ghost">
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
                      <span className="text-muted-foreground text-xs leading-5">由目前已啟用的 Extension 處理專案檔案。</span>
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
              disabled={disabled}
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
              aria-autocomplete="list"
              aria-controls={completionOptions.length > 0 ? "chat-composer-completions" : undefined}
              aria-expanded={completionOptions.length > 0}
              aria-haspopup="listbox"
              aria-label="詢問 AICaht"
              className="min-h-11 max-h-[140px] min-w-0 flex-1 resize-none overflow-y-auto whitespace-pre-wrap break-words border-0 bg-transparent px-1 py-[11px] leading-[1.45] text-foreground outline-none placeholder:text-muted-foreground/70"
              disabled={disabled}
              onKeyDown={(event) => {
                if (completionOptions.length > 0 && event.key === "ArrowDown") {
                  event.preventDefault()
                  setCompletionIndex((current) => (current + 1) % completionOptions.length)
                  return
                }
                if (completionOptions.length > 0 && event.key === "ArrowUp") {
                  event.preventDefault()
                  setCompletionIndex((current) => (current - 1 + completionOptions.length) % completionOptions.length)
                  return
                }
                if (completionOptions.length > 0 && event.key === "Escape") {
                  event.preventDefault()
                  setCompletionContext(null)
                  return
                }
                if (completionOptions.length > 0 && (event.key === "Enter" || event.key === "Tab") && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  const option = completionOptions[completionIndex]
                  if (option) applyCompletion(option)
                  return
                }
                if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }}
              onChange={(event) => {
                setValue(event.target.value)
                updateCompletion(event.target.value, event.target.selectionStart ?? event.target.value.length)
              }}
              onClick={(event) => updateCompletion(event.currentTarget.value, event.currentTarget.selectionStart ?? event.currentTarget.value.length)}
              onSelect={(event) => updateCompletion(event.currentTarget.value, event.currentTarget.selectionStart ?? event.currentTarget.value.length)}
              placeholder={placeholder}
              ref={textareaRef}
              rows={1}
              value={value}
            />
            {commandLabel && (
              <span className="inline-flex h-8 max-w-32 shrink-0 items-center gap-1 rounded-full border border-border bg-muted/40 px-2 text-muted-foreground text-xs max-[760px]:hidden" title={`目前 Command /${commandLabel}`}>
                <CommandIcon aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">/{commandLabel}</span>
              </span>
            )}
            {modelOptions && onModelChange && modelOptions.length > 0 ? (
              <span className="max-[760px]:hidden">
                <ModelSwitcher
                  activeModelKey={selectedModelKey ?? null}
                  disabled={disabled}
                  loading={modelLoading}
                  models={modelOptions}
                  onModelChange={onModelChange}
                  variant="composer"
                />
              </span>
            ) : modelLabel && (
              <span className="inline-flex h-8 max-w-36 shrink-0 items-center gap-1 rounded-full border border-border bg-muted/40 px-2 text-muted-foreground text-xs max-[760px]:hidden" title={`目前 Model ${modelLabel}`}>
                <Settings2Icon aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">{modelLabel}</span>
                <ChevronDownIcon aria-hidden="true" className="size-3 shrink-0" />
              </span>
            )}
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
              <Button aria-label="語音輸入" className="size-10 min-h-10 min-w-10 rounded-full border-0 bg-transparent shadow-none before:hidden hover:bg-muted" disabled={disabled} size="icon" variant="ghost">
                <MicIcon aria-hidden="true" />
              </Button>
              <Button aria-label="送出訊息" className="size-11 min-h-11 min-w-11 rounded-full border-primary bg-primary text-primary-foreground shadow-none before:hidden hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-35" disabled={(!value.trim() && !pinContext) || sending || disabled} loading={sending} size="icon" type="submit">
                <SendIcon aria-hidden="true" />
              </Button>
            </div>
          </div>
          
        </div>
        {uploadError ? <p className="text-center text-destructive text-xs">{uploadError}</p> : <p className="text-center text-muted-foreground text-xs">{hint}</p>}
      </div>
    </form>
  )
}
