import { describe, it, expect, vi, beforeEach } from "vitest";
import { createServerAdapter, models } from "../server.js";

describe("openrouter adapter", () => {
  it("exports correct adapter type", () => {
    const adapter = createServerAdapter();
    expect(adapter.type).toBe("openrouter");
  });

  it("has a non-empty static models list", () => {
    expect(models.length).toBeGreaterThan(0);
    for (const m of models) {
      expect(m.id).toContain("/");
      expect(m.label.length).toBeGreaterThan(0);
    }
  });

  it("testEnvironment fails when apiKey is missing", async () => {
    const adapter = createServerAdapter();
    const result = await adapter.testEnvironment({
      companyId: "test-company",
      adapterType: "openrouter",
      config: {},
    });
    expect(result.status).toBe("fail");
    expect(result.checks.some((c) => c.code === "api_key_missing")).toBe(true);
  });

  it("execute returns error when apiKey is missing", async () => {
    const adapter = createServerAdapter();
    const onLog = vi.fn().mockResolvedValue(undefined);

    const result = await adapter.execute({
      runId: "run-1",
      agent: { id: "agent-1", companyId: "co-1", name: "Test", adapterType: "openrouter", adapterConfig: {} },
      runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: null },
      config: {},
      context: {},
      onLog,
    });

    expect(result.exitCode).toBe(1);
    expect(result.summary).toMatch(/api key/i);
  });

  it("getConfigSchema returns fields including apiKey and model", async () => {
    const adapter = createServerAdapter();
    expect(adapter.getConfigSchema).toBeDefined();
    const schema = await adapter.getConfigSchema!();
    const keys = schema.fields.map((f) => f.key);
    expect(keys).toContain("apiKey");
    expect(keys).toContain("model");
    expect(keys).toContain("temperature");
    expect(keys).toContain("maxTokens");
  });

  it("listModels falls back to static list when API is unavailable", async () => {
    const adapter = createServerAdapter();
    const result = await adapter.listModels!();
    expect(result.length).toBeGreaterThan(0);
  });
});
