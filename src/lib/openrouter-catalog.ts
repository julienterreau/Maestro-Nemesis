import {
  FEATURED_MODELS,
  FREE_MODELS,
  PINNED_MODELS,
  type CatalogModel,
  capabilitiesFromModalities,
  isFreeModel,
} from "@/lib/models";

type OpenRouterModel = {
  id?: string;
  name?: string;
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
    modality?: string;
  };
};

type Cache = {
  models: CatalogModel[];
  fetchedAt: number;
};

const CACHE_MS = 30 * 60 * 1000;
let cache: Cache | null = null;
let inflight: Promise<CatalogModel[]> | null = null;

export function getPinnedCatalog(): CatalogModel[] {
  return PINNED_MODELS;
}

function providerFromId(id: string) {
  const [provider] = id.split("/");
  if (!provider) return "OpenRouter";
  return provider
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function nameFromId(id: string, rawName?: string) {
  if (rawName?.trim()) {
    return rawName.replace(/^[^:]+:\s*/, "").trim();
  }
  return id.split("/")[1] ?? id;
}

function toCatalogModel(item: OpenRouterModel): CatalogModel | null {
  if (!item.id) return null;
  const inputs = item.architecture?.input_modalities ?? [];
  const outputs = item.architecture?.output_modalities ?? [];
  const modality = item.architecture?.modality ?? "";
  const isTextOut =
    outputs.includes("text") ||
    outputs.length === 0 ||
    modality.includes("->text");
  const caps = capabilitiesFromModalities([...inputs, ...outputs]);
  if (!isTextOut && !caps.image && !caps.audio && !caps.video) return null;

  return {
    id: item.id,
    name: nameFromId(item.id, item.name),
    provider: providerFromId(item.id),
    ...caps,
  };
}

export async function getOpenRouterCatalog(): Promise<CatalogModel[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) {
    return cache.models;
  }
  if (inflight) return inflight;

  inflight = fetchFullCatalog().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function fetchFullCatalog(): Promise<CatalogModel[]> {
  const headers: HeadersInit = {};
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers,
      next: { revalidate: 1800 },
    });
    if (!response.ok) {
      throw new Error(`OpenRouter models ${response.status}`);
    }

    const payload = (await response.json()) as { data?: OpenRouterModel[] };
    const remote = (payload.data ?? [])
      .map(toCatalogModel)
      .filter((model): model is CatalogModel => model !== null);

    const byId = new Map<string, CatalogModel>();
    for (const model of PINNED_MODELS) byId.set(model.id, model);
    for (const model of remote) {
      if (model.id.endsWith(":free") && !isFreeModel(model.id)) continue;
      const pinned = byId.get(model.id);
      if (pinned && isFreeModel(model.id)) {
        byId.set(model.id, {
          ...pinned,
          image: model.image,
          audio: model.audio,
          video: model.video,
          pdf: model.pdf,
        });
        continue;
      }
      if (!pinned) byId.set(model.id, model);
    }

    const models = [...byId.values()].sort((a, b) => {
      const featuredA = FEATURED_MODELS.some((item) => item.id === a.id);
      const featuredB = FEATURED_MODELS.some((item) => item.id === b.id);
      if (featuredA !== featuredB) return featuredA ? -1 : 1;
      const freeA = FREE_MODELS.findIndex((item) => item.id === a.id);
      const freeB = FREE_MODELS.findIndex((item) => item.id === b.id);
      if (freeA !== -1 || freeB !== -1) {
        if (freeA === -1) return 1;
        if (freeB === -1) return -1;
        return freeA - freeB;
      }
      return a.name.localeCompare(b.name, "fr");
    });

    cache = { models, fetchedAt: Date.now() };
    return models;
  } catch {
    return PINNED_MODELS;
  }
}
