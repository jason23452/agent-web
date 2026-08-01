import { apiRequest, type ApiRequestConfig } from "./client";

export type SkillScope = "project" | "global";
export type SkillEntry = { name: string; description: string; scope: SkillScope; inherited?: boolean; overridesGlobal?: boolean; path: string; source: "skills.sh" | "archive"; fileCount: number };
export type SkillListResponse = { scope: SkillScope; project?: string; includeGlobal: boolean; entries: SkillEntry[] };
export type SkillImportResult = { imported: Array<{ name: string; scope: SkillScope; fileCount: number; source: SkillEntry["source"] }>; skipped: Array<{ name: string; reason: string }>; failed: Array<{ source: string; reason: string }> };

export function listOpenCodeSkills(scope: SkillScope, project?: string, includeGlobal = false, config?: ApiRequestConfig) { return apiRequest<SkillListResponse>("/bff/opencode-skills", { ...config, query: { ...config?.query, scope, project: scope === "project" ? project : undefined, includeGlobal: scope === "project" ? includeGlobal : undefined } }); }
export function importSkillUrls(body: { scope: SkillScope; project?: string; sources: string[]; overwrite?: boolean; restart?: boolean; reason?: string }, config?: ApiRequestConfig) { return apiRequest<SkillImportResult>("/bff/opencode-skills/import-url", { ...config, method: "POST", body }); }
export function importSkillArchives(files: File[], options: { scope: SkillScope; project?: string; overwrite?: boolean; restart?: boolean; reason?: string }, config?: ApiRequestConfig) { const form = new FormData(); for (const file of files) form.append("files", file); const query = { ...config?.query, ...options }; return apiRequest<SkillImportResult>("/bff/opencode-skills/import-archives", { ...config, method: "POST", body: form, query, headers: undefined }); }
export function deleteOpenCodeSkill(name: string, scope: SkillScope, project?: string, config?: ApiRequestConfig) { return apiRequest(`/bff/opencode-skills/${encodeURIComponent(name)}`, { ...config, method: "DELETE", query: { ...config?.query, scope, project: scope === "project" ? project : undefined, restart: true, reason: "skill-deleted" } }); }
