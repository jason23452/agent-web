import { apiRequest, type ApiRequestConfig } from "./client"

export type OpenCodeQuestionOption = {
  description: string
  label: string
}

export type OpenCodeQuestionInfo = {
  custom?: boolean
  header: string
  multiple?: boolean
  options: OpenCodeQuestionOption[]
  question: string
}

export type OpenCodeQuestionRequest = {
  id: string
  questions: OpenCodeQuestionInfo[]
  sessionID: string
  tool?: {
    callID: string
    messageID: string
  }
}

export type OpenCodeQuestionAnswers = string[][]

export function listOpenCodeQuestions(directory: string, config?: ApiRequestConfig) {
  return apiRequest<OpenCodeQuestionRequest[]>("/bff/questions", {
    ...config,
    query: { ...config?.query, directory },
  })
}

export function replyOpenCodeQuestion(requestID: string, directory: string, answers: OpenCodeQuestionAnswers, config?: ApiRequestConfig) {
  return apiRequest<boolean>(`/bff/questions/${encodeURIComponent(requestID)}/reply`, {
    ...config,
    body: { answers },
    method: "POST",
    query: { ...config?.query, directory },
  })
}

export function rejectOpenCodeQuestion(requestID: string, directory: string, config?: ApiRequestConfig) {
  return apiRequest<boolean>(`/bff/questions/${encodeURIComponent(requestID)}/reject`, {
    ...config,
    method: "POST",
    query: { ...config?.query, directory },
  })
}
