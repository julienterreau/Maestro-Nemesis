export const VENICE_MODEL =
  "cognitivecomputations/dolphin-mistral-24b-venice-edition";

export const DEFAULT_MODEL = VENICE_MODEL;

export const MEDIA_MODEL = "google/gemini-2.5-flash";
export const VISION_MODEL = MEDIA_MODEL;
export const IMAGE_GEN_MODEL = "google/gemini-3.1-flash-image";
export const VIDEO_GEN_MODEL = "bytedance/seedance-2.0";

export type MediaKind = "image" | "audio" | "video" | "pdf";

export type CatalogModel = {
  id: string;
  name: string;
  provider: string;
  image: boolean;
  audio: boolean;
  video: boolean;
  pdf: boolean;
};

export const FEATURED_MODELS: CatalogModel[] = [
  {
    id: VENICE_MODEL,
    name: "Uncensored (0 rétention)",
    provider: "Venice",
    image: false,
    audio: false,
    video: false,
    pdf: false,
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    image: true,
    audio: true,
    video: false,
    pdf: true,
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    image: true,
    audio: false,
    video: false,
    pdf: false,
  },
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "Anthropic",
    image: true,
    audio: false,
    video: false,
    pdf: true,
  },
  {
    id: MEDIA_MODEL,
    name: "Gemini 2.5 Flash",
    provider: "Google",
    image: true,
    audio: true,
    video: true,
    pdf: true,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    provider: "Meta",
    image: false,
    audio: false,
    video: false,
    pdf: false,
  },
];

export const MODELS = FEATURED_MODELS;

type MessageLike = {
  parts: Array<{ type: string; mediaType?: string }>;
};

export function isModelId(id: string) {
  return /^[\w.-]+\/[\w.:-]+$/.test(id) && id.length <= 180;
}

export function isModelAllowed(id: string) {
  return isModelId(id);
}

export function capabilitiesFromModalities(modalities: string[]) {
  const set = new Set(modalities.map((item) => item.toLowerCase()));
  return {
    image: set.has("image"),
    audio: set.has("audio"),
    video: set.has("video"),
    pdf: set.has("file") || set.has("pdf") || set.has("document"),
  };
}

export function findCatalogModel(id: string, catalog: CatalogModel[] = FEATURED_MODELS) {
  return catalog.find((model) => model.id === id) ?? FEATURED_MODELS.find((model) => model.id === id);
}

export function getModelLabel(id: string, catalog: CatalogModel[] = FEATURED_MODELS) {
  return findCatalogModel(id, catalog)?.name ?? id;
}

export function guessMediaType(name: string, type = "") {
  if (type) return type;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image/jpeg";
  if (["mp3", "wav", "m4a", "ogg"].includes(ext)) return "audio/mpeg";
  if (["mp4", "mov", "webm"].includes(ext)) return "video/mp4";
  if (ext === "pdf") return "application/pdf";
  return type;
}

export function mediaKindFromType(mediaType: string): MediaKind | null {
  if (mediaType.startsWith("image/")) return "image";
  if (mediaType.startsWith("audio/")) return "audio";
  if (mediaType.startsWith("video/")) return "video";
  if (mediaType === "application/pdf") return "pdf";
  return null;
}

export function collectMediaKinds(messages: MessageLike[]): MediaKind[] {
  const kinds = new Set<MediaKind>();
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type !== "file" || !part.mediaType) continue;
      const kind = mediaKindFromType(part.mediaType);
      if (kind) kinds.add(kind);
    }
  }
  return [...kinds];
}

export function modelSupportsMedia(
  id: string,
  kind: MediaKind,
  catalog: CatalogModel[] = FEATURED_MODELS,
) {
  return Boolean(findCatalogModel(id, catalog)?.[kind]);
}

export function pickCapableModel(
  kinds: MediaKind[],
  catalog: CatalogModel[] = FEATURED_MODELS,
  preferred?: string,
) {
  if (kinds.length === 0) {
    return isModelId(preferred ?? "") ? preferred! : DEFAULT_MODEL;
  }
  if (preferred && kinds.every((kind) => modelSupportsMedia(preferred, kind, catalog))) {
    return preferred;
  }
  if (kinds.every((kind) => modelSupportsMedia(MEDIA_MODEL, kind, catalog))) {
    return MEDIA_MODEL;
  }
  const match =
    FEATURED_MODELS.find((model) => kinds.every((kind) => model[kind])) ??
    catalog.find((model) => kinds.every((kind) => model[kind]));
  return match?.id ?? MEDIA_MODEL;
}

export function resolveModelForMessages(
  modelId: string,
  messages: MessageLike[],
  catalog: CatalogModel[] = FEATURED_MODELS,
) {
  const kinds = collectMediaKinds(messages);
  const selected = isModelId(modelId) ? modelId : DEFAULT_MODEL;
  return pickCapableModel(kinds, catalog, selected);
}

export function mediaSwitchLabel(kinds: MediaKind[]) {
  if (kinds.includes("video") && kinds.includes("audio")) {
    return "l’audio et la vidéo";
  }
  if (kinds.includes("video")) return "la vidéo";
  if (kinds.includes("audio")) return "l’audio";
  if (kinds.includes("image")) return "les images";
  if (kinds.includes("pdf")) return "les PDF";
  return "ce fichier";
}

export function modelMediaLabel(
  id: string,
  catalog: CatalogModel[] = FEATURED_MODELS,
) {
  const model = findCatalogModel(id, catalog);
  if (!model) return "";
  return [
    model.image ? "images" : null,
    model.audio ? "audio" : null,
    model.video ? "vidéo" : null,
    model.pdf ? "pdf" : null,
  ]
    .filter(Boolean)
    .join(" · ");
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
