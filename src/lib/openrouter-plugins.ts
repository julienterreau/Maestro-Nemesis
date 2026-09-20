export type RouterPlugins = {
  advisor: boolean;
  subagent: boolean;
  fusion: boolean;
};

export const DEFAULT_PLUGINS: RouterPlugins = {
  advisor: false,
  subagent: false,
  fusion: false,
};

export function parseRouterPlugins(value: unknown): RouterPlugins {
  const raw = value && typeof value === "object" ? (value as Partial<RouterPlugins>) : {};
  return {
    advisor: Boolean(raw.advisor),
    subagent: Boolean(raw.subagent),
    fusion: Boolean(raw.fusion),
  };
}

export function hasEnabledPlugin(plugins: RouterPlugins) {
  return plugins.advisor || plugins.subagent || plugins.fusion;
}

export function buildOpenRouterTools(plugins: RouterPlugins) {
  const tools: Array<Record<string, unknown>> = [];

  if (plugins.advisor) {
    tools.push({
      type: "openrouter:advisor",
      parameters: {
        model: "~anthropic/claude-opus-latest",
        forward_transcript: true,
        instructions:
          "Tu es un conseiller senior. Sois décisif, concret, et va à l’essentiel.",
      },
    });
  }

  if (plugins.subagent) {
    tools.push({
      type: "openrouter:subagent",
      parameters: {
        model: "~anthropic/claude-haiku-latest",
        instructions:
          "Tu es un worker rapide. Exécute exactement la tâche décrite, sans digression.",
      },
    });
  }

  if (plugins.fusion) {
    tools.push({
      type: "openrouter:fusion",
    });
  }

  return tools;
}
