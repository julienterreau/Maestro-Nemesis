export async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(
      response.ok
        ? "Réponse vide du serveur."
        : `Erreur ${response.status}. Réessaie dans un instant.`,
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Réponse serveur invalide.");
  }
}
