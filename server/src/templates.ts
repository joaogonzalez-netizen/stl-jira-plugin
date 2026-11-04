import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const PatternCheckSchema = z.object({ pattern: z.string().min(1), message: z.string().min(1) }).strict();

export const TemplateSectionSchema = z
  .object({
    heading: z.string().min(1).optional(),
    headingPattern: z.string().min(1).optional(),
    required: z.boolean(),
    format: z.enum(["text", "actionItems", "bullets", "code"]),
    hint: z.string().min(1),
    panel: z.enum(["info", "note", "success", "warning", "error"]).optional(),
    expand: z.boolean().optional(),
    minItems: z.number().int().positive().optional(),
    minLines: z.number().int().positive().optional(),
    minOccurrences: z.number().int().positive().optional(),
    minScenarios: z.number().int().positive().optional(),
    contains: z.array(z.string().min(1)).optional(),
    containsAny: z.array(z.string().min(1)).optional(),
    containsMessage: z.string().optional(),
    containsAnyMessage: z.string().optional(),
    containsSeverity: z.enum(["error", "warning"]).optional(),
    matches: z.array(PatternCheckSchema).optional(),
    eachBullet: z.array(PatternCheckSchema).optional(),
  })
  .strict()
  .refine((s) => Boolean(s.heading) !== Boolean(s.headingPattern), {
    message: "Cada seção precisa de exatamente um entre 'heading' e 'headingPattern'.",
  });

export const TemplateSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    name: z.string().min(1),
    issueTypes: z.array(z.string().min(1)).min(1),
    description: z.string().min(1),
    questions: z.array(z.string().min(1)).min(1),
    title: z.object({ maxLength: z.number().int().positive(), hint: z.string().min(1) }).strict(),
    sections: z.array(TemplateSectionSchema).min(1),
  })
  .strict();

export type TemplateSection = z.infer<typeof TemplateSectionSchema>;
export type Template = z.infer<typeof TemplateSchema>;

/** Pasta dos templates: STL_TEMPLATES_DIR ou a pasta `templates` do repositório/pacote. */
export function templatesDir(): string {
  return process.env.STL_TEMPLATES_DIR || fileURLToPath(new URL("../templates", import.meta.url));
}

/** Lê os templates a cada chamada: quem editar um arquivo não precisa reiniciar o MCP. */
export function loadTemplates(dir: string = templatesDir()): Template[] {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  const templates: Template[] = [];
  for (const file of files) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(join(dir, file), "utf8"));
    } catch (err) {
      throw new Error(`Template ${file}: JSON inválido (${err instanceof Error ? err.message : String(err)}).`);
    }
    const parsed = TemplateSchema.safeParse(raw);
    if (!parsed.success) {
      const detail = parsed.error.issues.map((i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`).join("; ");
      throw new Error(`Template ${file} inválido: ${detail}`);
    }
    const duplicated = templates.find((t) => t.id === parsed.data.id);
    if (duplicated) throw new Error(`Template ${file}: o id '${parsed.data.id}' já existe em outro arquivo.`);
    templates.push(parsed.data);
  }
  if (!templates.length) throw new Error(`Nenhum template .json encontrado em ${dir}.`);
  return templates;
}

export function getTemplate(id: string, dir?: string): Template {
  const found = loadTemplates(dir).find((t) => t.id === id);
  if (!found) {
    const ids = loadTemplates(dir).map((t) => t.id).join(", ");
    throw new Error(`Template '${id}' não existe. Disponíveis: ${ids}.`);
  }
  return found;
}

/** Templates cujo tipo de issue do Jira bate com `issueType` (pode haver mais de um, como na Spike). */
export function templatesForIssueType(issueType: string, dir?: string): Template[] {
  const wanted = issueType.trim().toLowerCase();
  return loadTemplates(dir).filter((t) => t.issueTypes.some((it) => it.toLowerCase() === wanted));
}

/** Esqueleto em markdown para o cliente mostrar ao usuário antes de preencher. */
export function renderSkeleton(t: Template): string {
  const lines: string[] = [`# ${t.name}`, "", t.description, "", `Título: ${t.title.hint}`, "", "## Perguntas de abertura"];
  for (const q of t.questions) lines.push(`- ${q}`);
  lines.push("", "## Seções, na ordem");
  for (const s of t.sections) {
    const label = s.heading ?? `(padrão ${s.headingPattern})`;
    const flags = [s.required ? "obrigatória" : "opcional", s.format];
    if (s.panel) flags.push(`painel ${s.panel}`);
    if (s.expand) flags.push("em Expand");
    lines.push(`### ${label} (${flags.join(", ")})`, s.hint, "");
  }
  return lines.join("\n").trimEnd();
}
