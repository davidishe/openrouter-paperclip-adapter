import { buildPrompt } from "./prompt-builder.js";
import { OpenRouterApiClient } from "./openrouter-api.js";
const ADAPTER_TYPE = "openrouter";
const MAX_HISTORY_MESSAGES = 20;
export const models = [
    { id: "openai/gpt-4o", label: "GPT-4o" },
    { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
    { id: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
    { id: "anthropic/claude-3-5-haiku", label: "Claude 3.5 Haiku" },
    { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
    { id: "google/gemini-pro-1.5", label: "Gemini 1.5 Pro" },
    { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
    { id: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek Chat V3" },
    { id: "deepseek/deepseek-r1", label: "DeepSeek R1" },
    { id: "mistralai/mistral-large", label: "Mistral Large" },
    { id: "qwen/qwen-2.5-72b-instruct", label: "Qwen 2.5 72B" },
    { id: "x-ai/grok-3-beta", label: "Grok 3 Beta" },
];
export const agentConfigurationDoc = `# OpenRouter Adapter Configuration

## API Key
The adapter resolves the API key in this order:
1. adapterConfig.apiKey (set directly in the adapter config form)
2. OPENROUTER_API_KEY environment variable (set in agent env config)

## Required
- model: model ID in provider/name format
  Examples: openai/gpt-4o, anthropic/claude-sonnet-4-5, google/gemini-2.0-flash-001

## Optional
- apiKey: OpenRouter API key (can use OPENROUTER_API_KEY env var instead)
- maxTokens: max output tokens (default: 8192)
- temperature: sampling temperature 0.0–2.0 (default: 0.7)
- timeoutMs: request timeout in ms (default: 120000)
- customSystemPrompt: extra instructions appended to system prompt
- siteUrl: your site URL for OpenRouter attribution (default: https://paperclip.ing)
- siteName: your site name for OpenRouter attribution (default: Paperclip)

## Getting an API Key
1. Sign up at https://openrouter.ai
2. Go to https://openrouter.ai/keys and create a key
3. Add credits at https://openrouter.ai/credits

## Supported Models
OpenRouter routes to 300+ models. Popular choices:
- openai/gpt-4o — OpenAI GPT-4o
- anthropic/claude-sonnet-4-5 — Anthropic Claude Sonnet
- google/gemini-2.0-flash-001 — Google Gemini Flash
- meta-llama/llama-3.3-70b-instruct — Meta Llama 3.3 (free tier available)
- deepseek/deepseek-chat-v3-0324 — DeepSeek Chat
- deepseek/deepseek-r1 — DeepSeek R1 (reasoning)

Full model list: https://openrouter.ai/models
`;
function resolveApiKey(config) {
    return (config.apiKey ||
        config.env?.["OPENROUTER_API_KEY"] ||
        process.env["OPENROUTER_API_KEY"] ||
        "");
}
function resolveApiKeySource(config) {
    if (config.apiKey)
        return "adapterConfig.apiKey";
    if (config.env?.["OPENROUTER_API_KEY"])
        return "OPENROUTER_API_KEY (agent env config)";
    if (process.env["OPENROUTER_API_KEY"])
        return "OPENROUTER_API_KEY (server env)";
    return null;
}
function normalizeSession(sessionParams) {
    const base = { schemaVersion: 1, messageHistory: [] };
    if (!sessionParams)
        return base;
    const candidate = sessionParams;
    if (!Array.isArray(candidate.messageHistory))
        return base;
    return {
        schemaVersion: typeof candidate.schemaVersion === "number" ? candidate.schemaVersion : 1,
        messageHistory: candidate.messageHistory.filter((m) => typeof m === "object" &&
            m !== null &&
            ["system", "user", "assistant"].includes(m.role) &&
            typeof m.content === "string"),
    };
}
async function execute(ctx) {
    const config = ctx.config;
    const apiKey = resolveApiKey(config);
    if (!apiKey) {
        const errorMessage = "OpenRouter API key is not configured. Set apiKey in adapter config or OPENROUTER_API_KEY env var.";
        await ctx.onLog("stderr", `[openrouter] ${errorMessage}\n`);
        return {
            exitCode: 1,
            signal: null,
            timedOut: false,
            usage: { inputTokens: 0, outputTokens: 0 },
            provider: "openrouter",
            model: "unknown",
            costUsd: 0,
            summary: `Error: ${errorMessage}`,
        };
    }
    const model = config.model ?? "openai/gpt-4o";
    const sessionState = normalizeSession(ctx.runtime.sessionParams);
    const client = new OpenRouterApiClient({ ...config, apiKey });
    await ctx.onLog("stdout", `[openrouter] Starting run ${ctx.runId} for agent "${ctx.agent.name}"\n`);
    await ctx.onLog("stdout", `[openrouter] Model: ${model}\n`);
    const { system, user } = buildPrompt(ctx, config);
    const messages = [{ role: "system", content: system }];
    if (sessionState.messageHistory?.length) {
        messages.push(...sessionState.messageHistory);
        await ctx.onLog("stdout", `[openrouter] Restored ${sessionState.messageHistory.length} message(s) from session\n`);
    }
    messages.push({ role: "user", content: user });
    try {
        const result = await client.chatCompletion(messages, model);
        const updatedHistory = [
            ...(sessionState.messageHistory ?? []),
            { role: "user", content: user },
            { role: "assistant", content: result.content },
        ].slice(-MAX_HISTORY_MESSAGES);
        await ctx.onLog("stdout", `[openrouter] Completed. Model: ${result.model}. Tokens: ${result.usage.totalTokens} (prompt: ${result.usage.promptTokens}, completion: ${result.usage.completionTokens})${result.costUsd != null ? `. Cost: $${result.costUsd.toFixed(6)}` : ""}\n`);
        return {
            exitCode: 0,
            signal: null,
            timedOut: false,
            usage: {
                inputTokens: result.usage.promptTokens,
                outputTokens: result.usage.completionTokens,
            },
            provider: "openrouter",
            model: result.model,
            costUsd: result.costUsd ?? 0,
            summary: result.content,
            sessionParams: {
                schemaVersion: 1,
                messageHistory: updatedHistory,
            },
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await ctx.onLog("stderr", `[openrouter] API error: ${errorMessage}\n`);
        return {
            exitCode: 1,
            signal: null,
            timedOut: false,
            usage: { inputTokens: 0, outputTokens: 0 },
            provider: "openrouter",
            model,
            costUsd: 0,
            summary: `Error: ${errorMessage}`,
            sessionParams: sessionState,
        };
    }
}
async function testEnvironment(ctx) {
    const config = ctx.config;
    const checks = [];
    const apiKey = resolveApiKey(config);
    const keySource = resolveApiKeySource(config);
    if (!apiKey) {
        checks.push({
            code: "api_key_missing",
            level: "error",
            message: "OpenRouter API key is not set. Add apiKey to adapter config or set OPENROUTER_API_KEY env var. Get a key at https://openrouter.ai/keys",
        });
        return {
            adapterType: ADAPTER_TYPE,
            status: "fail",
            checks,
            testedAt: new Date().toISOString(),
        };
    }
    checks.push({
        code: "api_key_found",
        level: "info",
        message: `API key resolved from ${keySource}.`,
    });
    const client = new OpenRouterApiClient({ ...config, apiKey });
    const connectionResult = await client.testConnection();
    if (!connectionResult.ok) {
        checks.push({
            code: "openrouter_unreachable",
            level: "error",
            message: `OpenRouter is not reachable: ${connectionResult.error}`,
        });
    }
    else {
        checks.push({
            code: "openrouter_reachable",
            level: "info",
            message: `Connected to OpenRouter successfully. ${connectionResult.models?.length ?? 0} models available.`,
        });
        const configuredModel = config.model;
        if (configuredModel) {
            const modelExists = connectionResult.models?.some((m) => m.id === configuredModel);
            if (modelExists) {
                checks.push({
                    code: "model_available",
                    level: "info",
                    message: `Model "${configuredModel}" is available on OpenRouter.`,
                });
            }
            else {
                checks.push({
                    code: "model_not_found",
                    level: "warn",
                    message: `Model "${configuredModel}" was not found in the OpenRouter model list. It may still work if it is a valid model ID.`,
                    hint: "Browse models at https://openrouter.ai/models",
                });
            }
        }
        else {
            checks.push({
                code: "model_defaulted",
                level: "info",
                message: `No model configured. Defaulting to "openai/gpt-4o".`,
            });
        }
    }
    return {
        adapterType: ADAPTER_TYPE,
        status: checks.some((c) => c.level === "error") ? "fail" : "pass",
        checks,
        testedAt: new Date().toISOString(),
    };
}
async function listModels() {
    try {
        const client = new OpenRouterApiClient({ apiKey: "" });
        const liveModels = await client.listModels();
        if (liveModels.length > 0) {
            return liveModels.map((m) => ({ id: m.id, label: m.name }));
        }
    }
    catch {
        // fall through to static list
    }
    return models;
}
async function getConfigSchema() {
    let modelOptions = [];
    try {
        const client = new OpenRouterApiClient({ apiKey: "" });
        const liveModels = await client.listModels();
        if (liveModels.length > 0) {
            modelOptions = liveModels.map((m) => ({
                value: m.id,
                label: m.name,
            }));
        }
    }
    catch {
        // ignore
    }
    if (modelOptions.length === 0) {
        modelOptions = models.map((m) => ({ value: m.id, label: m.label }));
    }
    const defaultModel = "openai/gpt-4o";
    return {
        fields: [
            {
                key: "apiKey",
                label: "API Key",
                type: "text",
                required: false,
                hint: "Your OpenRouter API key from https://openrouter.ai/keys. Can also be set via OPENROUTER_API_KEY env var.",
            },
            {
                key: "model",
                label: "Model",
                type: "select",
                options: modelOptions,
                default: defaultModel,
                required: true,
                hint: "Model ID in provider/name format. Browse all at https://openrouter.ai/models",
            },
            {
                key: "temperature",
                label: "Temperature",
                type: "number",
                default: 0.7,
                hint: "Sampling temperature (0.0–2.0). Lower = more deterministic.",
            },
            {
                key: "maxTokens",
                label: "Max tokens",
                type: "number",
                default: 8192,
                hint: "Maximum tokens in the response.",
            },
            {
                key: "customSystemPrompt",
                label: "Custom system prompt",
                type: "textarea",
                hint: "Extra instructions appended to the system prompt.",
            },
            {
                key: "siteUrl",
                label: "Site URL",
                type: "text",
                default: "https://paperclip.ing",
                hint: "Your site URL sent to OpenRouter for attribution (optional).",
            },
        ],
    };
}
export function createServerAdapter() {
    return {
        type: ADAPTER_TYPE,
        execute,
        testEnvironment,
        models,
        listModels,
        getConfigSchema,
        agentConfigurationDoc,
        supportsLocalAgentJwt: false,
        supportsInstructionsBundle: false,
        requiresMaterializedRuntimeSkills: false,
    };
}
//# sourceMappingURL=server.js.map