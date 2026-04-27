export interface OpenRouterAdapterConfig {
    /** OpenRouter API key — required */
    apiKey?: string;
    /** Model ID in OpenRouter format, e.g. "openai/gpt-4o" */
    model?: string;
    maxTokens?: number;
    temperature?: number;
    timeoutMs?: number;
    customSystemPrompt?: string;
    /** Optional site URL sent in HTTP-Referer header */
    siteUrl?: string;
    /** Optional site name sent in X-Title header */
    siteName?: string;
    /** Resolved env vars from agent environment config — populated by Paperclip at runtime */
    env?: Record<string, string>;
}
export interface OpenRouterMessage {
    role: "system" | "user" | "assistant";
    content: string;
}
export interface OpenRouterSessionState {
    schemaVersion: number;
    messageHistory?: OpenRouterMessage[];
}
export interface OpenRouterUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}
export interface OpenRouterApiResult {
    content: string;
    usage: OpenRouterUsage;
    model: string;
    costUsd: number | null;
}
export interface OpenRouterModelEntry {
    id: string;
    name: string;
    description?: string;
    pricing?: {
        prompt: string;
        completion: string;
    };
}
//# sourceMappingURL=types.d.ts.map