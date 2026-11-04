import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

export const JIRA_DIR = process.env.STL_JIRA_DIR ?? join(homedir(), ".claude", "jira");

const CredentialsSchema = z.object({
  domain: z.string().min(1),
  email: z.string().email(),
  apiToken: z.string().min(8),
});

export type Credentials = z.infer<typeof CredentialsSchema>;

export interface ResolvedCredentials {
  credentials: Credentials;
  source: string;
}

/** "empresa.atlassian.net", "https://empresa.atlassian.net/" -> "empresa.atlassian.net" */
export function normalizeDomain(raw: string): string {
  return raw.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m?.[1] && m[2] !== undefined) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}

function fromRaw(raw: unknown, source: string): ResolvedCredentials | null {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const candidate = {
    domain: normalizeDomain(String(obj.domain ?? obj.JIRA_DOMAIN ?? process.env.JIRA_DOMAIN ?? "")),
    email: obj.email ?? obj.JIRA_EMAIL,
    apiToken: obj.apiToken ?? obj.JIRA_API_TOKEN,
  };
  const parsed = CredentialsSchema.safeParse(candidate);
  return parsed.success ? { credentials: parsed.data, source } : null;
}

function fromFile(path: string): ResolvedCredentials | null {
  const text = readFileSync(path, "utf8");
  const raw = path.endsWith(".json") ? (JSON.parse(text) as unknown) : parseEnvFile(text);
  return fromRaw(raw, path);
}

/**
 * Ordem: variáveis de ambiente -> credentials.json -> qualquer outro
 * *.json / *.env solto na pasta (ordem alfabética). O domínio pode vir do
 * ambiente (JIRA_DOMAIN) para a org configurar uma vez só.
 */
export function resolveCredentials(): ResolvedCredentials | null {
  const fromEnv = fromRaw(
    { email: process.env.JIRA_EMAIL, apiToken: process.env.JIRA_API_TOKEN },
    "variáveis de ambiente",
  );
  if (fromEnv) return fromEnv;

  if (!existsSync(JIRA_DIR)) return null;
  const files = readdirSync(JIRA_DIR)
    .filter((f) => f.endsWith(".json") || f.endsWith(".env"))
    .sort((a, b) => (a === "credentials.json" ? -1 : b === "credentials.json" ? 1 : a.localeCompare(b)));
  for (const f of files) {
    const found = fromFile(join(JIRA_DIR, f));
    if (found) return found;
  }
  return null;
}

export function requireCredentials(): Credentials {
  const found = resolveCredentials();
  if (!found) {
    throw new Error(
      `Nenhuma credencial do Jira encontrada. Rode "npx stl-jira-mcp setup" ou coloque um credentials.json em ${JIRA_DIR}.`,
    );
  }
  return found.credentials;
}

export function saveCredentials(creds: Credentials): string {
  mkdirSync(JIRA_DIR, { recursive: true, mode: 0o700 });
  const path = join(JIRA_DIR, "credentials.json");
  writeFileSync(path, JSON.stringify(creds, null, 2) + "\n", { mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
}

export { CredentialsSchema };
