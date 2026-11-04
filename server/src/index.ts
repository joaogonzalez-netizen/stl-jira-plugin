#!/usr/bin/env node
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { existsSync } from "node:fs";
import { z } from "zod";
import { SectionSchema } from "./adf.js";
import { JIRA_DIR, resolveCredentials } from "./credentials.js";
import { gateCreate } from "./guard.js";
import { JiraClient } from "./jira.js";
import { runSetup } from "./setup.js";
import { getTemplate, loadTemplates, renderSkeleton } from "./templates.js";
import { validateCard } from "./validate.js";

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

const ok = (data: unknown): ToolResult => ({
  content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }],
});

/** Erros voltam como resultado (isError) com o corpo do Jira, sem nunca incluir a credencial. */
async function run(fn: () => Promise<unknown>): Promise<ToolResult> {
  try {
    return ok(await fn());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

async function main() {
  if (process.argv[2] === "setup") {
    await runSetup();
    return;
  }

  const server = new McpServer({ name: "stl-jira", version: "0.2.0" });
  // Credencial é lida a cada chamada: quem soltar o arquivo na pasta não precisa reiniciar o Claude.
  const client = () => JiraClient.fromDisk();

  server.tool(
    "jira_status",
    "Mostra se há credencial do Jira configurada (e de onde vem) e valida contra a API. Nunca devolve o token.",
    {},
    () =>
      run(async () => {
        const found = resolveCredentials();
        if (!found) {
          return {
            configured: false,
            folder: JIRA_DIR,
            folderExists: existsSync(JIRA_DIR),
            howTo: [
              "Rode no terminal: npx stl-jira-mcp setup (o token é digitado oculto)",
              `ou salve um credentials.json em ${JIRA_DIR}: {"domain","email","apiToken"}`,
              "Nunca cole o token no chat.",
            ],
          };
        }
        const me = await new JiraClient(found.credentials).whoAmI();
        return { configured: true, source: found.source, domain: found.credentials.domain, user: me.displayName };
      }),
  );

  server.tool("jira_list_projects", "Lista os projetos do Jira que a pessoa pode acessar.", {}, () =>
    run(() => client().listProjects()),
  );

  server.tool(
    "jira_list_issue_types",
    "Lista os tipos de issue reais de um projeto.",
    { projectKey: z.string().min(1) },
    ({ projectKey }) => run(() => client().listIssueTypes(projectKey)),
  );

  server.tool(
    "jira_create_issue",
    "Cria uma issue. `sections` vira a descrição ADF (heading, text, code, bullets, actionItems, links, panel, dividerBefore, expand). O card é validado contra o padrão do tipo (veja card_template_get) e a criação é recusada se não seguir. Para Spike, informe `template` (spike-refinamento ou spike-investigacao). Tipos sem padrão só criam com skipValidation=true, e só com a confirmação da pessoa. Use dryRun=true para ver a validação e o payload sem criar. O reporter é quem está conectado (o dono do token) e volta no resultado.",
    {
      projectKey: z.string().min(1),
      issueType: z.string().min(1),
      summary: z.string().min(1),
      sections: z.array(SectionSchema),
      labels: z.array(z.string()).optional(),
      template: z.string().min(1).optional(),
      skipValidation: z.boolean().optional(),
      dryRun: z.boolean().optional(),
    },
    ({ dryRun, template, skipValidation, ...input }) =>
      run(async () => {
        const gate = gateCreate({ ...input, template, skipValidation });
        if (gate.blocker && !dryRun) throw new Error(gate.blocker);
        const jira = client();
        const payload = jira.buildCreatePayload(input);
        if (dryRun) return { template: gate.template, validation: gate.validation, blocker: gate.blocker, payload };
        const created = await jira.createIssue(payload);
        // O reporter é sempre quem é dono do token: o card sai no nome da pessoa, nunca de outra.
        const me = await jira.whoAmI();
        const warnings = gate.validation?.warnings ?? [];
        return { ...created, reporter: me.displayName, ...(warnings.length ? { warnings } : {}) };
      }),
  );

  server.tool(
    "jira_update_issue",
    "Atualiza summary e descrição de uma issue existente (ex. ABC-123).",
    { key: z.string().min(1), summary: z.string().optional(), sections: z.array(SectionSchema) },
    ({ key, ...input }) => run(() => client().updateIssue(key, input)),
  );

  server.tool(
    "jira_attach_file",
    "Anexa um arquivo local (ex. print) a uma issue existente.",
    { issue: z.string().min(1), filePath: z.string().min(1) },
    ({ issue, filePath }) => run(async () => ({ attached: await client().attachFile(issue, filePath) })),
  );

  server.tool(
    "card_template_list",
    "Lista os padrões de abertura de card (épico, user story, bug, tarefa e spike) e o tipo de issue do Jira de cada um.",
    {},
    () =>
      run(async () =>
        loadTemplates().map((t) => ({ id: t.id, name: t.name, issueTypes: t.issueTypes, description: t.description })),
      ),
  );

  server.tool(
    "card_template_get",
    "Devolve o padrão de um tipo de card: perguntas de abertura, regra de título e as seções na ordem, com o critério de cada uma. Faça as perguntas de abertura à pessoa antes de escrever o card.",
    { id: z.string().min(1) },
    ({ id }) =>
      run(async () => {
        const template = getTemplate(id);
        return { template, skeleton: renderSkeleton(template) };
      }),
  );

  server.tool(
    "card_validate",
    "Valida o rascunho de um card contra o padrão do tipo, sem criar nada no Jira. Devolve erros (o card não está pronto) e avisos.",
    { template: z.string().min(1), summary: z.string(), sections: z.array(SectionSchema) },
    ({ template, summary, sections }) => run(async () => validateCard(getTemplate(template), { summary, sections })),
  );

  server.resource(
    "card-template",
    new ResourceTemplate("stl://templates/{id}", {
      list: async () => ({
        resources: loadTemplates().map((t) => ({
          uri: `stl://templates/${t.id}`,
          name: t.name,
          description: t.description,
          mimeType: "text/markdown",
        })),
      }),
    }),
    { description: "Padrão de abertura de cada tipo de card, em markdown.", mimeType: "text/markdown" },
    async (uri, { id }) => ({
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: renderSkeleton(getTemplate(String(id))) }],
    }),
  );

  await server.connect(new StdioServerTransport());
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
