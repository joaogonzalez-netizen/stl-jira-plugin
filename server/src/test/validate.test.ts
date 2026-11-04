import assert from "node:assert/strict";
import { test } from "node:test";
import type { Section } from "../adf.js";
import { getTemplate } from "../templates.js";
import { normalize, validateCard } from "../validate.js";
import { GHERKIN, IDIOMAS, bug, epic, spikeInvestigation, spikeRefinement, task, userStory } from "./fixtures.js";

const check = (id: string, summary: string, sections: Section[]) => validateCard(getTemplate(id), { summary, sections });
const messages = (items: { message: string }[]) => items.map((i) => i.message).join(" | ");

test("normalize tira acento e maiúsculas", () => {
  assert.equal(normalize("Português, ESPANHOL e Inglês"), "portugues, espanhol e ingles");
});

test("cada tipo de card aceita um rascunho completo", () => {
  const cases: [string, string, Section[]][] = [
    ["user-story", "US-01 — Gerar anúncio a partir da foto", userStory()],
    ["epico", "Seller: gerar anúncio a partir da foto", epic()],
    ["bug", "Personalizador: exportação do ornamento falha", bug()],
    ["tarefa", "Mapear o fluxo atual de onboarding", task()],
    ["spike-refinamento", "Spike — Refinamento técnico: gerador de anúncios", spikeRefinement()],
    ["spike-investigacao", "Spike — geração de vídeo no backend", spikeInvestigation()],
  ];
  for (const [id, summary, sections] of cases) {
    const result = check(id, summary, sections);
    assert.deepEqual(result.errors, [], `${id}: ${messages(result.errors)}`);
    assert.equal(result.valid, true, id);
  }
});

test("User Story sem o critério dos 3 idiomas não passa", () => {
  const sections = userStory().map((s) => (s.heading === "Critérios de Aceite" ? { ...s, actionItems: ["A", "B", "C"] } : s));
  const result = check("user-story", "US-01 — Gerar anúncio", sections);
  assert.equal(result.valid, false);
  assert.match(messages(result.errors), /português, espanhol e inglês/);
});

test("User Story com menos de 3 cenários Gherkin não passa", () => {
  const sections = userStory().map((s) => (s.heading === "Gherkin" ? { ...s, code: GHERKIN.split("\n\n")[0] ?? "" } : s));
  const result = check("user-story", "US-01 — Gerar anúncio", sections);
  assert.match(messages(result.errors), /pelo menos 3 cenários/);
});

test("User Story sem painel azul ou sem o formato Como/quero/para não passa", () => {
  const noPanel = userStory().map((s) => (s.heading === "User Story" ? { ...s, panel: undefined } : s));
  assert.match(messages(check("user-story", "US-01", noPanel).errors), /painel 'info'/);
  const badText = userStory().map((s) => (s.heading === "User Story" ? { ...s, text: "Quero gerar anúncios" } : s));
  assert.match(messages(check("user-story", "US-01", badText).errors), /Como \[persona/);
});

test("User Story sem a linha do épico gera só aviso", () => {
  const sections = userStory().map((s) => (s.heading === "Contexto" ? { ...s, text: "O maker já tem produtos." } : s));
  const result = check("user-story", "US-01 — Gerar anúncio", sections);
  assert.equal(result.valid, true);
  assert.match(messages(result.warnings), /Épico:/);
});

test("Bug sem evidência, sem idioma ou com severidade inválida não passa", () => {
  const noEvidence = bug().filter((s) => s.heading !== "Evidência");
  assert.match(messages(check("bug", "Personalizador: falha", noEvidence).errors), /Falta a seção/);

  const noLanguage = bug().map((s) => (s.heading === "Ambiente" ? { ...s, text: "Produção, Chrome" } : s));
  assert.match(messages(check("bug", "Personalizador: falha", noLanguage).errors), /idioma/);

  const badSeverity = bug().map((s) => (s.heading === "Impacto" ? { ...s, text: "Severidade: urgente\nClientes: 3" } : s));
  assert.match(messages(check("bug", "Personalizador: falha", badSeverity).errors), /Crítico, Alto, Médio ou Baixo/);
});

test("Bug exige o teste de regressão nos critérios", () => {
  const sections = bug().map((s) => (s.heading === "Critérios de Aceite" ? { ...s, actionItems: ["Exporta", "Funciona em português, espanhol e inglês", "Ok"] } : s));
  assert.equal(check("bug", "Personalizador: falha", sections).valid, false);
});

test("Épico sem a história de idiomas ou com pergunta sem área e sem bloqueio não passa", () => {
  const noIdiomas = epic().filter((s) => !/3 idiomas/.test(s.heading ?? ""));
  assert.match(messages(check("epico", "Seller: gerar anúncio", noIdiomas).errors), /idiomas/);

  const badQuestion = epic().map((s) => (s.heading === "Perguntas em aberto" ? { ...s, bullets: ["Qual a taxa atual?"] } : s));
  assert.match(messages(check("epico", "Seller: gerar anúncio", badQuestion).errors), /área responsável/);
});

test("Épico exige North Star, métrica alvo e de guarda", () => {
  const sections = epic().map((s) => (s.heading === "Métricas de sucesso" ? { ...s, text: "Downloads | Alvo | 20%" } : s));
  assert.equal(check("epico", "Seller: gerar anúncio", sections).valid, false);
});

test("Épico com menos de 2 histórias não passa", () => {
  const sections = epic().filter((s) => !/^US-0[12]/.test(s.heading ?? ""));
  assert.match(messages(check("epico", "Seller: gerar anúncio", sections).errors), /pelo menos 2 seções/);
});

test('a palavra "todo" em português não conta como texto de preenchimento', () => {
  const sections = task().map((s) => (s.heading === "Objetivo" ? { ...s, text: "Todo o fluxo de onboarding precisa ser mapeado." } : s));
  assert.equal(check("tarefa", "Mapear fluxo", sections).valid, true);
});

test("Spike de investigação exige pergunta com interrogação e timebox em dias", () => {
  const noQuestion = spikeInvestigation().map((s) => (s.heading === "Pergunta a responder" ? { ...s, text: "Avaliar geração de vídeo" } : s));
  assert.match(messages(check("spike-investigacao", "Spike — vídeo", noQuestion).errors), /ponto de interrogação/);

  const noTimebox = spikeInvestigation().map((s) => (s.heading === "Timebox" ? { ...s, text: "o quanto antes" } : s));
  assert.match(messages(check("spike-investigacao", "Spike — vídeo", noTimebox).errors), /timebox em dias/);
});

test("Spike de refinamento exige idiomas e instrumentação no checklist e o resultado esperado", () => {
  const short = spikeRefinement().map((s) => (s.heading === "Checklist de refinamento técnico" ? { ...s, actionItems: (s.actionItems ?? []).slice(0, 6) } : s));
  assert.equal(check("spike-refinamento", "Spike — Refinamento técnico: X", short).valid, false);
  const noResult = spikeRefinement().filter((s) => s.heading !== "Resultado esperado");
  assert.match(messages(check("spike-refinamento", "Spike — Refinamento técnico: X", noResult).errors), /Resultado esperado/);
});

test("Tarefa exige checklist em Action Items e a área de evidência", () => {
  const bullets = task().map((s) => (s.heading?.startsWith("Checklist") ? { heading: s.heading, bullets: ["a"] } : s));
  assert.match(messages(check("tarefa", "Mapear fluxo", bullets).errors), /Action Items/);
  const noEvidence = task().filter((s) => s.heading !== "Evidência de conclusão");
  assert.equal(check("tarefa", "Mapear fluxo", noEvidence).valid, false);
});

test("título vazio, longo demais ou com texto de preenchimento é erro", () => {
  assert.match(messages(check("tarefa", "  ", task()).errors), /vazio/);
  assert.match(messages(check("tarefa", "x".repeat(101), task()).errors), /máximo é 100/);
  assert.match(messages(check("tarefa", "Mapear fluxo TODO", task()).errors), /preenchimento/);
});

test("texto de preenchimento dentro de uma seção é erro", () => {
  const sections = task().map((s) => (s.heading === "Objetivo" ? { ...s, text: "TBD" } : s));
  assert.match(messages(check("tarefa", "Mapear fluxo", sections).errors), /preenchimento/);
});

test("seções fora de ordem e seções desconhecidas geram aviso, sem bloquear", () => {
  const reordered = [...task()].reverse();
  const unknown = [...task(), { heading: "Observações", text: "algo" }];
  assert.match(messages(check("tarefa", "Mapear fluxo", reordered).warnings), /fora da ordem/);
  const result = check("tarefa", "Mapear fluxo", unknown);
  assert.equal(result.valid, true);
  assert.match(messages(result.warnings), /não existe no template/);
});
