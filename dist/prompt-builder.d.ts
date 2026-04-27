import type { AdapterExecutionContext } from "@paperclipai/adapter-utils";
import type { OpenRouterAdapterConfig } from "./types.js";
export interface BuiltPrompt {
    system: string;
    user: string;
}
export declare function buildPrompt(ctx: AdapterExecutionContext, config: OpenRouterAdapterConfig): BuiltPrompt;
//# sourceMappingURL=prompt-builder.d.ts.map