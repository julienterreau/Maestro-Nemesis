export const VENICE_MODEL =
  "cognitivecomputations/dolphin-mistral-24b-venice-edition";

export const DEFAULT_MODEL = VENICE_MODEL;

export const MODELS = [
  {
    id: VENICE_MODEL,
    label: "Uncensored (0 rétention)",
    provider: "Venice",
  },
  { id: "openai/gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI" },
  { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4", provider: "Anthropic" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Google" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", provider: "Meta" },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];

export function isModelAllowed(id: string): id is ModelId {
  return MODELS.some((model) => model.id === id);
}

export function getModelLabel(id: string) {
  return MODELS.find((model) => model.id === id)?.label ?? id;
}

export function getOpenRouterProviderOptions(modelId: string) {
  const options: {
    zdr: true;
    data_collection: "deny";
    order?: string[];
    allow_fallbacks?: boolean;
  } = {
    zdr: true,
    data_collection: "deny",
  };

  if (modelId === VENICE_MODEL) {
    options.order = ["venice"];
    options.allow_fallbacks = false;
  }

  return options;
}
