import type { OpenRouterAdapterConfig, OpenRouterApiResult, OpenRouterMessage, OpenRouterModelEntry } from "./types.js";
export declare class OpenRouterApiClient {
    private readonly config;
    private readonly apiKey;
    private readonly siteUrl;
    private readonly siteName;
    constructor(config: OpenRouterAdapterConfig);
    private buildHeaders;
    chatCompletion(messages: OpenRouterMessage[], model: string): Promise<OpenRouterApiResult>;
    listModels(): Promise<OpenRouterModelEntry[]>;
    testConnection(): Promise<{
        ok: boolean;
        error?: string;
        models?: OpenRouterModelEntry[];
    }>;
}
//# sourceMappingURL=openrouter-api.d.ts.map