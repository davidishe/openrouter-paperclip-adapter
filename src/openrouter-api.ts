import { z } from "zod";
import type { OpenRouterAdapterConfig, OpenRouterApiResult, OpenRouterMessage, OpenRouterModelEntry, OpenRouterUsage } from "./types.js";

const BASE_URL = "https://openrouter.ai/api/v1";

const usageSchema = z.object({
  prompt_tokens: z.number().optional(),
  completion_tokens: z.number().optional(),
  total_tokens: z.number().optional(),
});

const choiceSchema = z.object({
  message: z.object({
    role: z.string(),
    content: z.string(),
  }),
  finish_reason: z.string().nullable().optional(),
});

const completionResponseSchema = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  choices: z.array(choiceSchema),
  usage: usageSchema.optional(),
});

const modelEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  pricing: z
    .object({
      prompt: z.string().optional(),
      completion: z.string().optional(),
    })
    .optional(),
});

const modelsResponseSchema = z.object({
  data: z.array(modelEntrySchema),
});

export class OpenRouterApiClient {
  private readonly apiKey: string;
  private readonly siteUrl: string;
  private readonly siteName: string;

  constructor(private readonly config: OpenRouterAdapterConfig) {
    this.apiKey = config.apiKey ?? "";
    this.siteUrl = config.siteUrl ?? "https://paperclip.ing";
    this.siteName = config.siteName ?? "Paperclip";
  }

  private buildHeaders(contentType = true): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "HTTP-Referer": this.siteUrl,
      "X-Title": this.siteName,
    };
    if (contentType) {
      headers["Content-Type"] = "application/json";
    }
    return headers;
  }

  async chatCompletion(messages: OpenRouterMessage[], model: string): Promise<OpenRouterApiResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 120000);

    const payload: Record<string, unknown> = {
      model,
      messages,
      max_tokens: this.config.maxTokens ?? 8192,
      temperature: this.config.temperature ?? 0.7,
    };

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenRouter API ${response.status}: ${body}`);
    }

    const parsed = completionResponseSchema.parse(await response.json());

    const choice = parsed.choices[0];
    if (!choice) {
      throw new Error("OpenRouter returned no choices in the response");
    }

    const rawUsage = parsed.usage;
    const usage: OpenRouterUsage = {
      promptTokens: rawUsage?.prompt_tokens ?? 0,
      completionTokens: rawUsage?.completion_tokens ?? 0,
      totalTokens: rawUsage?.total_tokens ?? 0,
    };

    // OpenRouter may return cost via X-OpenRouter-* headers or usage.cost
    const costHeader = response.headers.get("x-openrouter-cost-usd");
    const costUsd = costHeader != null ? parseFloat(costHeader) : null;

    return {
      content: choice.message.content,
      usage,
      model: parsed.model ?? model,
      costUsd: Number.isFinite(costUsd) ? costUsd : null,
    };
  }

  async listModels(): Promise<OpenRouterModelEntry[]> {
    const response = await fetch(`${BASE_URL}/models`, {
      headers: this.buildHeaders(false),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API ${response.status}: failed to list models`);
    }

    const parsed = modelsResponseSchema.parse(await response.json());
    return parsed.data.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      pricing: m.pricing
        ? {
            prompt: m.pricing.prompt ?? "0",
            completion: m.pricing.completion ?? "0",
          }
        : undefined,
    }));
  }

  async testConnection(): Promise<{ ok: boolean; error?: string; models?: OpenRouterModelEntry[] }> {
    if (!this.apiKey) {
      return { ok: false, error: "API key is not configured" };
    }
    try {
      const models = await this.listModels();
      return { ok: true, models };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
