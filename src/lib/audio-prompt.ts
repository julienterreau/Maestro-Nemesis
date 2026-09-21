const AUDIO_NOUN =
  /\b(audio|musique|morceau|m[eé]lodie|bruitages?|bruits?|sfx|soundscapes?|sounds?|ambiances?|mp3|wav|ogg|un sons?|des sons|le son|les sons|sons? de)\b/i;

const CREATE =
  /\b(fais|faites|cr[eé]e|cr[eé]er|g[eé]n[eè]re|compose|produis|invente|donne[- ]moi|fais[- ]moi|peux[- ]tu|pourrais[- ]tu|je veux|j['’]aimerais|je voudrais)\b/i;

const NATURE =
  /\b(pluie|pluis|rain|averse|gouttes?|for[eê]ts?|bois|jungle|oiseaux?|vent|temp[eê]te|oc[eé]ans?|mer|vagues?|plage|feu|chemin[eé]e|orage|tonnerre|grillons?|nuit|nature)\b/i;

const MUSIC_WORDS =
  /\b(musique|morceau|chanson|song|lyrics|paroles|m[eé]lodie|[eé]lectro|piano|rap|jazz|beat|guitare)\b/i;

export type SoundscapeKind =
  | "rain"
  | "forest"
  | "wind"
  | "ocean"
  | "fire"
  | "thunder"
  | "night"
  | "birds";

export function isAudioGenerationPrompt(text: string) {
  const t = text.trim();
  if (t.length < 4 || t.length > 500) return false;
  if (/\b(paroles|lyrics)\b/i.test(t) && /\b(chanson|song)\b/i.test(t)) {
    return false;
  }
  const hasAudio = AUDIO_NOUN.test(t);
  const hasCreate = CREATE.test(t);
  const hasNature = NATURE.test(t);
  return (hasAudio && hasCreate) || (hasCreate && hasNature) || (hasAudio && hasNature);
}

export function isSoundscapePrompt(text: string) {
  if (MUSIC_WORDS.test(text)) return false;
  return NATURE.test(text) || AUDIO_NOUN.test(text);
}

export function detectSoundscapeKind(text: string): SoundscapeKind | null {
  const t = text.toLowerCase();
  if (/orage|tonnerre|thunder/.test(t)) return "thunder";
  if (/pluie|pluis|rain|averse|gouttes?/.test(t)) return "rain";
  if (/oc[eé]an|mer|vagues?|plage|sea|waves?/.test(t)) return "ocean";
  if (/\bfeu\b|chemin[eé]e|\bfire\b/.test(t)) return "fire";
  if (/for[eê]t|jungle|\bbois\b|forest/.test(t)) return "forest";
  if (/\bvent\b|temp[eê]te|\bwind\b/.test(t)) return "wind";
  if (/grillons?|\bnuit\b|cricket/.test(t)) return "night";
  if (/oiseaux?|birds?/.test(t)) return "birds";
  return null;
}

export function toSoundEffectPrompt(text: string) {
  return `Realistic field recording / foley sound effect only. Not a song. No melody, no instruments, no drums, no beat, no vocals, no lyrics. Environmental audio: ${text.trim()}`;
}
