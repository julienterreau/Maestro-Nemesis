export function isImageGenerationPrompt(text: string) {
  const t = text.trim();
  if (t.length < 4 || t.length > 500) return false;
  if (/\b(d[eé]cris|analyse|explique|regarde|lis|que vois[- ]tu)\b/i.test(t)) {
    return false;
  }
  const wantsDraw = /\b(dessine|draw|illustre|peins)\b/i.test(t);
  const wantsImage =
    /\b(image|illustration|dessin|photo|visuel|logo|affiche|peinture|picture)\b/i.test(
      t,
    );
  const wantsCreate =
    /\b(fais|faites|cr[eé]e|cr[eé]er|g[eé]n[eè]re|produis)\b/i.test(t);
  return wantsDraw || (wantsImage && wantsCreate);
}

export function isVideoGenerationPrompt(text: string) {
  const t = text.trim();
  if (t.length < 4 || t.length > 500) return false;
  if (/\b(d[eé]cris|analyse|explique|regarde|lis|que vois[- ]tu)\b/i.test(t)) {
    return false;
  }
  const wantsVideo =
    /\b(vid[eé]os?|clips?|films?|mp4|séquences?|movie)\b/i.test(t);
  const wantsCreate =
    /\b(fais|faites|cr[eé]e|cr[eé]er|g[eé]n[eè]re|produis|filme|tourne)\b/i.test(
      t,
    );
  return wantsVideo && wantsCreate;
}
