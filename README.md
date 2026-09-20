# AI Cloud Local

Interface Next.js locale pour discuter avec des modèles cloud via [OpenRouter](https://openrouter.ai).

## Démarrage

1. Copiez `.env.example` vers `.env.local`.
2. Ajoutez votre clé OpenRouter dans `OPENROUTER_API_KEY`.
3. Lancez le serveur :

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

La clé API n’est jamais envoyée au navigateur : les appels passent par `/api/chat`.
