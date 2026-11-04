import assert from "node:assert/strict";
import { test } from "node:test";
import { gateCreate } from "../guard.js";
import { bug, epic, spikeInvestigation, spikeRefinement, task, userStory } from "./fixtures.js";

test("um card completo do tipo certo pode ser criado", () => {
  const gate = gateCreate({ issueType: "Bug", summary: "Personalizador: exportação falha", sections: bug() });
  assert.equal(gate.blocker, null);
  assert.equal(gate.template, "bug");
  assert.equal(gate.validation?.valid, true);
});

test("o padrão sai do tipo de issue do Jira", () => {
  const cases: [string, string, ReturnType<typeof task>][] = [
    ["Story", "user-story", userStory()],
    ["Epic", "epico", epic()],
    ["Task", "tarefa", task()],
  ];
  for (const [issueType, id, sections] of cases) {
    const gate = gateCreate({ issueType, summary: "Mapear fluxo de onboarding", sections });
    assert.equal(gate.template, id, issueType);
    assert.equal(gate.blocker, null, `${issueType}: ${gate.blocker}`);
  }
});

test("card fora do padrão é bloqueado e a mensagem lista o que falta", () => {
  const sections = bug().filter((s) => s.heading !== "Evidência");
  const gate = gateCreate({ issueType: "Bug", summary: "Personalizador: exportação falha", sections });
  assert.match(gate.blocker ?? "", /não segue o padrão 'bug'/);
  assert.match(gate.blocker ?? "", /Evidência/);
});

test("Spike sem 'template' é bloqueada por ambiguidade, e com 'template' passa", () => {
  const input = { issueType: "Spike", summary: "Spike — vídeo no backend", sections: spikeInvestigation() };
  assert.match(gateCreate(input).blocker ?? "", /mais de um padrão.*spike-investigacao.*spike-refinamento/);
  assert.equal(gateCreate({ ...input, template: "spike-investigacao" }).blocker, null);
  const refinement = gateCreate({ ...input, summary: "Spike — Refinamento técnico: X", sections: spikeRefinement(), template: "spike-refinamento" });
  assert.equal(refinement.blocker, null);
});

test("'template' informado vale mais do que o tipo de issue", () => {
  const gate = gateCreate({ issueType: "Story", summary: "Personalizador: exportação falha", sections: bug(), template: "bug" });
  assert.equal(gate.template, "bug");
  assert.equal(gate.blocker, null);
});

test("tipo sem padrão é bloqueado, a não ser com skipValidation", () => {
  const input = { issueType: "Design", summary: "Tela de histórico", sections: [{ heading: "Objetivo", text: "x" }] };
  assert.match(gateCreate(input).blocker ?? "", /Não há padrão para o tipo 'Design'.*skipValidation/);
  const skipped = gateCreate({ ...input, skipValidation: true });
  assert.equal(skipped.blocker, null);
  assert.equal(skipped.validation, null);
});

test("skipValidation libera até um card fora do padrão", () => {
  const gate = gateCreate({ issueType: "Bug", summary: "x", sections: [], skipValidation: true });
  assert.equal(gate.blocker, null);
});

test("template inexistente gera erro com os ids disponíveis", () => {
  assert.throws(() => gateCreate({ issueType: "Bug", summary: "x", sections: [], template: "nao-existe" }), /Disponíveis/);
});

test("avisos não bloqueiam e voltam na validação", () => {
  const sections = [...task(), { heading: "Observações", text: "algo" }];
  const gate = gateCreate({ issueType: "Task", summary: "Mapear fluxo", sections });
  assert.equal(gate.blocker, null);
  assert.ok((gate.validation?.warnings.length ?? 0) > 0);
});
