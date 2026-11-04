import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { getTemplate, loadTemplates, renderSkeleton, templatesForIssueType } from "../templates.js";

function tempDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "stl-templates-"));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  return dir;
}

const minimal = (id: string, extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    id,
    name: "Teste",
    issueTypes: ["Task"],
    description: "d",
    questions: ["q"],
    title: { maxLength: 80, hint: "h" },
    sections: [{ heading: "Objetivo", required: true, format: "text", hint: "h" }],
    ...extra,
  });

test("carrega os 6 templates do repositório", () => {
  const ids = loadTemplates().map((t) => t.id).sort();
  assert.deepEqual(ids, ["bug", "epico", "spike-investigacao", "spike-refinamento", "tarefa", "user-story"]);
});

test("mapeia o tipo de issue do Jira para os templates, sem diferenciar maiúsculas", () => {
  assert.deepEqual(templatesForIssueType("story").map((t) => t.id), ["user-story"]);
  assert.deepEqual(templatesForIssueType("EPIC").map((t) => t.id), ["epico"]);
  assert.deepEqual(templatesForIssueType("Bug").map((t) => t.id), ["bug"]);
  assert.deepEqual(templatesForIssueType("Task").map((t) => t.id), ["tarefa"]);
  assert.deepEqual(templatesForIssueType("Spike").map((t) => t.id).sort(), ["spike-investigacao", "spike-refinamento"]);
  assert.deepEqual(templatesForIssueType("Design"), []);
});

test("todas as expressões regulares dos templates compilam", () => {
  for (const t of loadTemplates()) {
    for (const s of t.sections) {
      const patterns = [s.headingPattern, ...(s.matches ?? []).map((m) => m.pattern), ...(s.eachBullet ?? []).map((m) => m.pattern)];
      for (const p of patterns) if (p) assert.doesNotThrow(() => new RegExp(p, "i"), `${t.id}: ${p}`);
    }
  }
});

test("getTemplate falha com o id inexistente e lista os disponíveis", () => {
  assert.throws(() => getTemplate("nao-existe"), /Disponíveis: .*bug/);
});

test("rejeita JSON inválido, com o nome do arquivo", () => {
  const dir = tempDir({ "quebrado.json": "{ nao é json" });
  assert.throws(() => loadTemplates(dir), /quebrado\.json: JSON inválido/);
});

test("rejeita chave desconhecida, para pegar erro de digitação ao editar", () => {
  const dir = tempDir({ "a.json": minimal("a", { sections: [{ heading: "X", required: true, format: "text", hint: "h", minItem: 2 }] }) });
  assert.throws(() => loadTemplates(dir), /a\.json inválido/);
});

test("rejeita seção sem heading nem headingPattern", () => {
  const dir = tempDir({ "a.json": minimal("a", { sections: [{ required: true, format: "text", hint: "h" }] }) });
  assert.throws(() => loadTemplates(dir), /heading/);
});

test("rejeita id repetido em arquivos diferentes", () => {
  const dir = tempDir({ "a.json": minimal("igual"), "b.json": minimal("igual") });
  assert.throws(() => loadTemplates(dir), /já existe/);
});

test("o esqueleto traz o nome, as perguntas e as seções na ordem", () => {
  const skeleton = renderSkeleton(getTemplate("bug"));
  assert.match(skeleton, /^# Bug/);
  assert.match(skeleton, /Perguntas de abertura/);
  assert.ok(skeleton.indexOf("### Passos para reproduzir") < skeleton.indexOf("### Evidência"));
});
