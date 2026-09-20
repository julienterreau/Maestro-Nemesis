function hostnameOf(value?: string | null) {
  if (!value?.trim()) return;
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).host;
  } catch {
    return;
  }
}

function isLocalHost(host: string) {
  return (
    host === "localhost" ||
    host.startsWith("localhost:") ||
    host === "127.0.0.1" ||
    host.startsWith("127.0.0.1:")
  );
}

function stripProtocol(value: string) {
  return value.replace(/^https?:\/\//, "");
}

export function getAuthFallbackUrl() {
  if (process.env.VERCEL) {
    const host =
      process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
    if (host) return `https://${stripProtocol(host)}`;
  }

  return (
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function getAllowedAuthHosts() {
  const hosts = new Set<string>(["localhost:3000", "127.0.0.1:3000"]);

  for (const value of [
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_URL,
    hostnameOf(process.env.BETTER_AUTH_URL),
    hostnameOf(process.env.NEXT_PUBLIC_APP_URL),
  ]) {
    if (value) hosts.add(stripProtocol(value));
  }

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? stripProtocol(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    : undefined;
  if (production?.endsWith(".vercel.app")) {
    const project = production.slice(0, -".vercel.app".length);
    if (project) hosts.add(`${project}*.vercel.app`);
  }

  return [...hosts];
}

export function getTrustedOrigins() {
  return getAllowedAuthHosts().flatMap((host) => {
    if (host.includes("://")) return [host];
    if (isLocalHost(host)) {
      return [`http://${host}`, `https://${host}`];
    }
    return [`https://${host}`];
  });
}
