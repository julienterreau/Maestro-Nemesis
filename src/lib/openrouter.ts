import { createOpenAI } from "@ai-sdk/openai";
import { getOpenRouterProviderOptions } from "@/lib/models";
import {
  buildOpenRouterTools,
  hasEnabledPlugin,
  type RouterPlugins,
} from "@/lib/openrouter-plugins";

export function getOpenRouter(modelId: string, plugins?: RouterPlugins) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim() ?? "";

  return createOpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    name: "openrouter",
    headers: {
      "HTTP-Referer":
        process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_SITE_NAME ?? "AI Cloud Local",
    },
    fetch: async (input, init) => {
      const nextInit = { ...init };

      if (typeof nextInit.body === "string") {
        try {
          const payload = JSON.parse(nextInit.body) as Record<string, unknown>;
          payload.model = modelId;
          payload.provider = getOpenRouterProviderOptions(modelId);

          if (plugins && hasEnabledPlugin(plugins)) {
            const existing = Array.isArray(payload.tools) ? payload.tools : [];
            payload.tools = [...existing, ...buildOpenRouterTools(plugins)];
          }

          nextInit.body = JSON.stringify(payload);
        } catch {
          // Keep the original body if it is not JSON.
        }
      }

      return fetch(input, nextInit);
    },
  });
}
