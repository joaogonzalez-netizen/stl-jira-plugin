import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { z } from "zod";
import { buildAdf, type Section } from "./adf.js";
import { type Credentials, requireCredentials } from "./credentials.js";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  pdf: "application/pdf",
  txt: "text/plain",
  json: "application/json",
};

export class JiraError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export class JiraClient {
  constructor(private readonly creds: Credentials) {}

  static fromDisk(): JiraClient {
    return new JiraClient(requireCredentials());
  }

  get domain(): string {
    return this.creds.domain;
  }

  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    const auth = Buffer.from(`${this.creds.email}:${this.creds.apiToken}`).toString("base64");
    const res = await fetch(`https://${this.creds.domain}${path}`, {
      ...init,
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json", ...init.headers },
    });
    const text = await res.text();
    if (!res.ok) throw new JiraError(res.status, `Jira ${res.status} em ${path}: ${text.slice(0, 1500)}`);
    return text ? (JSON.parse(text) as unknown) : {};
  }

  private json(path: string, method: string, body: unknown) {
    return this.request(path, { method, body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
  }

  async whoAmI(): Promise<{ displayName: string; emailAddress: string }> {
    return z
      .object({ displayName: z.string(), emailAddress: z.string().optional().default("") })
      .parse(await this.request("/rest/api/3/myself"));
  }

  async listProjects(): Promise<{ key: string; name: string }[]> {
    const res = z
      .object({ values: z.array(z.object({ key: z.string(), name: z.string() })) })
      .parse(await this.request("/rest/api/3/project/search?maxResults=100&orderBy=key"));
    return res.values;
  }

  async listIssueTypes(projectKey: string): Promise<string[]> {
    const res = z
      .object({ projects: z.array(z.object({ issuetypes: z.array(z.object({ name: z.string() })) })) })
      .parse(
        await this.request(
          `/rest/api/3/issue/createmeta?projectKeys=${encodeURIComponent(projectKey)}&expand=projects.issuetypes`,
        ),
      );
    const project = res.projects[0];
    if (!project) throw new Error(`Projeto '${projectKey}' não encontrado ou sem permissão.`);
    return project.issuetypes.map((t) => t.name);
  }

  buildCreatePayload(input: {
    projectKey: string;
    issueType: string;
    summary: string;
    sections: Section[];
    labels?: string[];
  }) {
    return {
      fields: {
        project: { key: input.projectKey },
        summary: input.summary,
        issuetype: { name: input.issueType },
        description: buildAdf(input.sections),
        ...(input.labels?.length ? { labels: input.labels } : {}),
      },
    };
  }

  async createIssue(payload: unknown): Promise<{ key: string; url: string }> {
    const { key } = z.object({ key: z.string() }).parse(await this.json("/rest/api/3/issue", "POST", payload));
    return { key, url: `https://${this.creds.domain}/browse/${key}` };
  }

  async updateIssue(key: string, input: { summary?: string; sections: Section[] }) {
    const fields: Record<string, unknown> = { description: buildAdf(input.sections) };
    if (input.summary) fields.summary = input.summary;
    await this.json(`/rest/api/3/issue/${encodeURIComponent(key)}`, "PUT", { fields });
    return { key, url: `https://${this.creds.domain}/browse/${key}` };
  }

  async attachFile(issueKey: string, filePath: string): Promise<string[]> {
    const name = basename(filePath);
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const form = new FormData();
    form.append("file", new Blob([readFileSync(filePath)], { type: MIME[ext] ?? "application/octet-stream" }), name);
    const res = z
      .array(z.object({ filename: z.string() }))
      .parse(
        await this.request(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/attachments`, {
          method: "POST",
          body: form,
          headers: { "X-Atlassian-Token": "no-check" },
        }),
      );
    return res.map((a) => a.filename);
  }
}
