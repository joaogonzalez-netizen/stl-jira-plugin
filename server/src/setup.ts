import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { CredentialsSchema, JIRA_DIR, normalizeDomain, saveCredentials } from "./credentials.js";
import { JiraClient } from "./jira.js";

/** Pergunta no terminal; com hidden=true o que é digitado/colado não aparece na tela. */
function ask(question: string, hidden = false): Promise<string> {
  let muted = false;
  const out = new Writable({
    write(chunk, _enc, cb) {
      if (!muted) process.stderr.write(chunk);
      cb();
    },
  });
  const rl = createInterface({ input: process.stdin, output: out, terminal: true });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stderr.write("\n");
      resolve(answer.trim());
    });
    muted = hidden;
  });
}

export async function runSetup(): Promise<void> {
  process.stderr.write(
    [
      "Configuração do Jira (STLFLIX)",
      "Gere seu token em https://id.atlassian.com/manage-profile/security/api-tokens",
      `Ele fica só na sua máquina, em ${JIRA_DIR}/credentials.json (permissão 600).`,
      "",
    ].join("\n"),
  );
  const domain = normalizeDomain(
    process.env.JIRA_DOMAIN ?? (await ask("Domínio (ex. empresa.atlassian.net): ")),
  );
  const email = await ask("E-mail da conta Atlassian: ");
  const apiToken = await ask("API token (colar, não aparece): ", true);

  const creds = CredentialsSchema.parse({ domain, email, apiToken });
  const me = await new JiraClient(creds).whoAmI();
  const path = saveCredentials(creds);
  process.stderr.write(`OK: autenticado como ${me.displayName}. Salvo em ${path}\n`);
}
