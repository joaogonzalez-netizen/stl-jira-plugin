import type { Section } from "./adf.js";
import { getTemplate, templatesForIssueType } from "./templates.js";
import { type ValidationResult, validateCard } from "./validate.js";

export type GateInput = {
  issueType: string;
  summary: string;
  sections: Section[];
  template?: string;
  skipValidation?: boolean;
};

export type Gate = {
  /** Padrão usado na validação, ou null quando a validação foi dispensada. */
  template: string | null;
  validation: ValidationResult | null;
  /** Motivo de a criação estar bloqueada; null quando pode criar. */
  blocker: string | null;
};

function formatFailure(result: ValidationResult): string {
  const lines = result.errors.map((e) => `- ${e.section}: ${e.message}`);
  return `O card não segue o padrão '${result.template}':\n${lines.join("\n")}\nCorrija e tente de novo.`;
}

/**
 * Decide se um card pode ser criado: acha o padrão pelo `template` informado ou pelo tipo de issue,
 * valida o rascunho e devolve o motivo do bloqueio, se houver. Não fala com o Jira.
 */
export function gateCreate(input: GateInput, dir?: string): Gate {
  if (input.skipValidation) return { template: null, validation: null, blocker: null };

  let template;
  if (input.template) {
    template = getTemplate(input.template, dir);
  } else {
    const candidates = templatesForIssueType(input.issueType, dir);
    if (candidates.length === 0) {
      return {
        template: null,
        validation: null,
        blocker: `Não há padrão para o tipo '${input.issueType}'. Para criar mesmo assim, passe skipValidation: true, com a confirmação da pessoa.`,
      };
    }
    if (candidates.length > 1) {
      const ids = candidates.map((t) => t.id).join(", ");
      return {
        template: null,
        validation: null,
        blocker: `Há mais de um padrão para o tipo '${input.issueType}': ${ids}. Informe qual em 'template'.`,
      };
    }
    template = candidates[0];
  }
  if (!template) throw new Error("Nenhum padrão encontrado.");

  const validation = validateCard(template, { summary: input.summary, sections: input.sections });
  return { template: template.id, validation, blocker: validation.valid ? null : formatFailure(validation) };
}
