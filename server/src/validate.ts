import type { Section } from "./adf.js";
import type { Template, TemplateSection } from "./templates.js";

export type CardIssue = { section: string; message: string };
export type ValidationResult = {
  valid: boolean;
  template: string;
  errors: CardIssue[];
  warnings: CardIssue[];
};

/** Minúsculas e sem acento, para comparar texto escrito de formas diferentes. */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** TODO, TBD e XXX só valem em maiúsculas: "todo" é uma palavra comum do português e não é marcador. */
const hasPlaceholder = (text: string): boolean => /\b(?:TODO|TBD|XXX)\b/.test(text) || /lorem ipsum/i.test(text);

function bodyText(sec: Section): string {
  return [sec.text, sec.code, ...(sec.bullets ?? []), ...(sec.actionItems ?? []), ...(sec.links ?? []).map((l) => l.text)]
    .filter((part): part is string => Boolean(part))
    .join("\n");
}

function matchingSections(ts: TemplateSection, sections: Section[]): Section[] {
  if (ts.heading) {
    const wanted = normalize(ts.heading).trim();
    return sections.filter((s) => s.heading && normalize(s.heading).trim() === wanted);
  }
  const re = new RegExp(ts.headingPattern ?? "", "i");
  return sections.filter((s) => s.heading && re.test(normalize(s.heading)));
}

function label(ts: TemplateSection): string {
  return ts.heading ?? `seção ${ts.headingPattern}`;
}

function formatHasContent(ts: TemplateSection, sec: Section): boolean {
  switch (ts.format) {
    case "actionItems":
      return (sec.actionItems?.length ?? 0) > 0;
    case "bullets":
      return (sec.bullets?.length ?? 0) > 0;
    case "code":
      return Boolean(sec.code?.trim());
    default:
      return bodyText(sec).trim().length > 0;
  }
}

function formatName(format: TemplateSection["format"]): string {
  return { text: "texto", actionItems: "Action Items", bullets: "lista de itens", code: "bloco de código" }[format];
}

function checkSection(ts: TemplateSection, sec: Section, name: string, errors: CardIssue[], warnings: CardIssue[]) {
  const fail = (message: string) => errors.push({ section: name, message });

  if (!formatHasContent(ts, sec)) {
    fail(`Sem conteúdo. Esta seção deve vir como ${formatName(ts.format)}.`);
    return;
  }
  if (ts.panel && sec.panel !== ts.panel) fail(`Deve estar em um painel '${ts.panel}'.`);
  if (ts.expand && !sec.expand) fail("Deve estar dentro de um Expand.");

  const body = bodyText(sec);
  const norm = normalize(body);

  if (ts.minItems) {
    const count = ts.format === "bullets" ? (sec.bullets?.length ?? 0) : (sec.actionItems?.length ?? 0);
    if (count < ts.minItems) fail(`Precisa de pelo menos ${ts.minItems} itens (tem ${count}).`);
  }
  if (ts.minLines) {
    const lines = (sec.text ?? "").split("\n").filter((l) => l.trim()).length;
    if (lines < ts.minLines) fail(`Precisa de pelo menos ${ts.minLines} linhas (tem ${lines}).`);
  }
  if (ts.minScenarios) {
    const scenarios = normalize(sec.code ?? "").match(/^\s*(esquema do cenario|cenario)\s*:/gm)?.length ?? 0;
    if (scenarios < ts.minScenarios) fail(`Precisa de pelo menos ${ts.minScenarios} cenários (tem ${scenarios}).`);
  }
  if (ts.contains) {
    const missing = ts.contains.filter((term) => !norm.includes(normalize(term)));
    if (missing.length) {
      const target = ts.containsSeverity === "warning" ? warnings : errors;
      target.push({ section: name, message: ts.containsMessage ?? `Faltam termos esperados: ${missing.join(", ")}.` });
    }
  }
  if (ts.containsAny && !ts.containsAny.some((term) => norm.includes(normalize(term)))) {
    fail(ts.containsAnyMessage ?? `Precisa citar pelo menos um destes: ${ts.containsAny.join(", ")}.`);
  }
  for (const m of ts.matches ?? []) {
    if (!new RegExp(m.pattern, "is").test(norm)) fail(m.message);
  }
  for (const m of ts.eachBullet ?? []) {
    const re = new RegExp(m.pattern, "i");
    for (const bullet of sec.bullets ?? []) {
      if (!re.test(normalize(bullet))) fail(`${m.message} (item: "${bullet.slice(0, 60)}")`);
    }
  }
}

export function validateCard(template: Template, card: { summary: string; sections: Section[] }): ValidationResult {
  const errors: CardIssue[] = [];
  const warnings: CardIssue[] = [];

  const summary = card.summary.trim();
  if (!summary) errors.push({ section: "Título", message: "O título está vazio." });
  if (summary.length > template.title.maxLength) {
    errors.push({ section: "Título", message: `O título tem ${summary.length} caracteres e o máximo é ${template.title.maxLength}.` });
  }
  if (hasPlaceholder(summary)) errors.push({ section: "Título", message: "O título tem texto de preenchimento (TODO, TBD, XXX)." });

  const firstIndex: number[] = [];
  const claimed = new Set<Section>();

  for (const ts of template.sections) {
    const found = matchingSections(ts, card.sections);
    found.forEach((s) => claimed.add(s));
    const name = label(ts);

    if (!found.length) {
      if (ts.required) errors.push({ section: name, message: `Falta a seção '${name}'. ${ts.hint}` });
      continue;
    }
    if (ts.minOccurrences && found.length < ts.minOccurrences) {
      errors.push({ section: name, message: `Precisa de pelo menos ${ts.minOccurrences} seções deste tipo (tem ${found.length}).` });
    }
    const first = found[0];
    if (first) firstIndex.push(card.sections.indexOf(first));
    for (const sec of found) checkSection(ts, sec, sec.heading ?? name, errors, warnings);
  }

  if (firstIndex.some((idx, i) => i > 0 && idx < (firstIndex[i - 1] ?? -1))) {
    warnings.push({ section: "Ordem", message: "As seções estão fora da ordem do template." });
  }
  for (const sec of card.sections) {
    if (sec.heading && !claimed.has(sec)) {
      warnings.push({ section: sec.heading, message: "Seção que não existe no template." });
    }
    if (hasPlaceholder(bodyText(sec))) {
      errors.push({ section: sec.heading ?? "(sem título)", message: "Tem texto de preenchimento (TODO, TBD, XXX)." });
    }
  }

  return { valid: errors.length === 0, template: template.id, errors, warnings };
}
