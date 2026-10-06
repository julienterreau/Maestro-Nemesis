import { createOpenAI } from "@ai-sdk/openai";
import { VENICE_MODEL, getOpenRouterProviderOptions } from "@/lib/models";
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
      let payload: Record<string, unknown> | null = null;

      if (typeof nextInit.body === "string") {
        try {
          payload = JSON.parse(nextInit.body) as Record<string, unknown>;
          payload.model = modelId;
          payload.provider = getOpenRouterProviderOptions(modelId);

          if (plugins && hasEnabledPlugin(plugins)) {
            const existing = Array.isArray(payload.tools) ? payload.tools : [];
            payload.tools = [...existing, ...buildOpenRouterTools(plugins)];
          }

          nextInit.body = JSON.stringify(payload);
        } catch {
          payload = null;
        }
      }

      const response = await fetch(input, nextInit);
      if (response.ok || modelId === VENICE_MODEL || !payload) {
        return response;
      }

      const text = await response.text();
      if (!/zdr|guardrail|data policy|0 endpoints/i.test(text)) {
        return new Response(text, {
          status: response.status,
          headers: response.headers,
        });
      }

      payload.model = VENICE_MODEL;
      payload.provider = getOpenRouterProviderOptions(VENICE_MODEL);
      delete payload.tools;
      return fetch(input, {
        ...nextInit,
        body: JSON.stringify(payload),
      });
    },
  });
}
