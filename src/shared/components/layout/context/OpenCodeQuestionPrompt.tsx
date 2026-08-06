import { CheckIcon, CircleHelpIcon, XIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { OpenCodeQuestionAnswers, OpenCodeQuestionRequest } from "@/shared/api/opencodeQuestions"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"

type AnswerDraft = {
  custom: string
  selected: string[]
}

type OpenCodeQuestionPromptProps = {
  busy?: boolean
  error?: string | null
  onReject: () => Promise<void> | void
  onReply: (answers: OpenCodeQuestionAnswers) => Promise<void> | void
  pendingCount?: number
  request: OpenCodeQuestionRequest
}

function createDrafts(request: OpenCodeQuestionRequest): AnswerDraft[] {
  return request.questions.map(() => ({ custom: "", selected: [] }))
}

function buildAnswers(request: OpenCodeQuestionRequest, drafts: AnswerDraft[]): OpenCodeQuestionAnswers {
  return request.questions.map((question, index) => {
    const draft = drafts[index] ?? { custom: "", selected: [] }
    const custom = draft.custom.trim()
    if (!question.multiple) return custom ? [custom] : draft.selected.slice(0, 1)
    return [...draft.selected, ...(custom ? [custom] : [])]
  })
}

export function OpenCodeQuestionPrompt({ busy = false, error, onReject, onReply, pendingCount = 1, request }: OpenCodeQuestionPromptProps) {
  const [drafts, setDrafts] = useState<AnswerDraft[]>(() => createDrafts(request))
  const containerRef = useRef<HTMLDivElement>(null)
  const answers = buildAnswers(request, drafts)
  const canSubmit = answers.length === request.questions.length && answers.every((answer) => answer.length > 0)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      containerRef.current?.querySelector<HTMLElement>("input, button")?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [request.id])

  function toggleOption(questionIndex: number, label: string, multiple: boolean) {
    setDrafts((current) => current.map((draft, index) => {
      if (index !== questionIndex) return draft
      if (!multiple) return { custom: "", selected: [label] }
      return {
        ...draft,
        selected: draft.selected.includes(label)
          ? draft.selected.filter((item) => item !== label)
          : [...draft.selected, label],
      }
    }))
  }

  function updateCustom(questionIndex: number, value: string, multiple: boolean) {
    setDrafts((current) => current.map((draft, index) => index === questionIndex
      ? { custom: value, selected: multiple || !value.trim() ? draft.selected : [] }
      : draft,
    ))
  }

  return (
    <div className="w-full min-w-0 bg-[linear-gradient(to_top,var(--background)_88%,transparent)] px-3 pt-2 pb-3 sm:px-6 sm:pt-3.5 sm:pb-6 lg:px-8">
      <div
        aria-labelledby={`question-request-${request.id}`}
        className="mx-auto grid w-full max-w-[820px] min-w-0 gap-4 rounded-2xl border border-primary/25 bg-background p-4 shadow-[0_14px_40px_color-mix(in_oklch,var(--foreground)_10%,transparent)] sm:p-5"
        ref={containerRef}
        role="region"
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <CircleHelpIcon aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-sm" id={`question-request-${request.id}`}>Agent 需要你的回答</h2>
            <p className="mt-0.5 text-muted-foreground text-xs" role="status">
              {request.questions.length > 1 ? `請完成以下 ${request.questions.length} 個問題。` : "請選擇或輸入答案後繼續。"}
              {pendingCount > 1 ? ` 尚有 ${pendingCount - 1} 組問題等待處理。` : ""}
            </p>
          </div>
        </div>

        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!canSubmit || busy) return
            void onReply(answers)
          }}
        >
          {request.questions.map((question, questionIndex) => {
            const draft = drafts[questionIndex] ?? { custom: "", selected: [] }
            const inputType = question.multiple ? "checkbox" : "radio"
            return (
              <fieldset className="grid min-w-0 gap-2.5 rounded-xl border border-border bg-muted/25 p-3.5" disabled={busy} key={`${request.id}-${questionIndex}`}>
                <legend className="max-w-full px-1 text-sm">
                  <span className="mr-2 rounded-md bg-muted px-1.5 py-0.5 font-medium text-[10px] uppercase tracking-wide text-muted-foreground">{question.header}</span>
                  <span className="font-medium text-foreground">{question.question}</span>
                </legend>
                <p className="text-muted-foreground text-[11px]">{question.multiple ? "可選擇多個答案" : "請選擇一個答案"}</p>
                <div className="grid gap-2">
                  {question.options.map((option, optionIndex) => {
                    const descriptionID = `question-${request.id}-${questionIndex}-${optionIndex}-description`
                    return (
                      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border bg-background px-3 py-2.5 transition-colors hover:bg-accent/60 has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5" key={`${option.label}-${optionIndex}`}>
                        <input
                          aria-describedby={option.description ? descriptionID : undefined}
                          checked={draft.selected.includes(option.label)}
                          className="mt-0.5 size-4 shrink-0 accent-primary"
                          name={`question-${request.id}-${questionIndex}`}
                          onChange={() => toggleOption(questionIndex, option.label, Boolean(question.multiple))}
                          type={inputType}
                          value={option.label}
                        />
                        <span className="grid min-w-0 gap-0.5">
                          <strong className="font-medium text-sm">{option.label}</strong>
                          {option.description && <span className="text-muted-foreground text-xs leading-5" id={descriptionID}>{option.description}</span>}
                        </span>
                      </label>
                    )
                  })}
                </div>
                {question.custom !== false && (
                  <label className="grid gap-1.5 text-muted-foreground text-xs">
                    自訂答案{question.multiple ? "（可與選項一起送出）" : ""}
                    <Input
                      aria-label={`${question.header} 自訂答案`}
                      onChange={(event) => updateCustom(questionIndex, event.target.value, Boolean(question.multiple))}
                      placeholder="輸入其他答案"
                      value={draft.custom}
                    />
                  </label>
                )}
              </fieldset>
            )
          })}

          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-destructive-foreground text-xs" role="alert">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button disabled={busy} onClick={() => void onReject()} type="button" variant="destructive-outline">
              <XIcon aria-hidden="true" />拒絕回答
            </Button>
            <Button disabled={!canSubmit || busy} loading={busy} type="submit">
              <CheckIcon aria-hidden="true" />送出答案
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
