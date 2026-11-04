// Empacota o servidor MCP em um único arquivo, para o plugin rodar sem node_modules.
// `node build.mjs` grava server/bundle/stl-jira.mjs; `node build.mjs --check` só confere se o arquivo commitado está em dia.
import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, "bundle", "stl-jira.mjs");

const result = await build({
  entryPoints: [join(root, "src", "index.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  write: false,
  legalComments: "none",
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
});
const text = result.outputFiles[0]?.text;
if (!text) throw new Error("O esbuild não gerou saída.");

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(out, "utf8");
  } catch {
    // arquivo ainda não existe: tratado como desatualizado
  }
  if (current !== text) {
    console.error("bundle/stl-jira.mjs está desatualizado. Rode: npm --prefix server run bundle");
    process.exit(1);
  }
  console.log("bundle em dia");
} else {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, text);
  console.log(`bundle gravado: ${out} (${Math.round(text.length / 1024)} KB)`);
}
