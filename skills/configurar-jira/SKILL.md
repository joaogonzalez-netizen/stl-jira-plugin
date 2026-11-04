---
name: configurar-jira
description: >-
  Ajuda a conectar a conta do Jira de cada pessoa ao plugin stl-jira-plugin. Use quando o jira_status disser que não há credencial, quando o /jira-task falhar por autenticação, quando a pessoa perguntar como configurar o Jira, criar o token ou por que o card saiu com outro reporter.
---

# Configurar o Jira

Cada pessoa usa o **próprio** token do Jira. É assim que o reporter de cada card é quem realmente o abriu.

## 1. Ver o estado

Chame `jira_status`. Ele diz se há credencial, de onde vem e, quando válida, **em nome de quem** está conectado. Confira com a pessoa se o nome é o dela.

## 2. Se não estiver configurado

Conduza a pessoa por um passo de cada vez, confirmando que o anterior deu certo antes do próximo. Nunca peça o token no chat.

### Parte A: GitHub (instalar o plugin)

Só é preciso se o `/plugin marketplace add` falhar ou se o repositório estiver privado.

1. Ter uma conta no GitHub e aceitar o convite de colaborador do repositório `joaogonzalez-netizen/stl-jira-plugin` (chega por e-mail ou em https://github.com/notifications).
2. Deixar o `git` do computador logado no GitHub: instalar o GitHub CLI (https://cli.github.com) e rodar `gh auth login`, escolhendo HTTPS e o login pelo navegador. Alternativa: chave SSH cadastrada em https://github.com/settings/keys.
3. Conferir o acesso com `git ls-remote https://github.com/joaogonzalez-netizen/stl-jira-plugin.git`. Se listar commits, está certo. Se pedir senha ou der "not found", o convite ainda não foi aceito ou o login do `git` está errado.
4. Adicionar o marketplace e instalar, no terminal:
   - `claude plugin marketplace add joaogonzalez-netizen/stl-jira-plugin`
   - `claude plugin install stl-jira-plugin@stl-jira`

### Parte B: Jira (token da própria conta)

1. Abrir https://id.atlassian.com/manage-profile/security/api-tokens, entrar com o login da própria conta Atlassian e clicar em **Create API token**.
2. Dar um nome como "Claude", escolher a validade e criar. Copiar o token na hora: ele só aparece uma vez.
3. Abrir a configuração do plugin `stl-jira-plugin` e preencher **domínio do Jira** (ex.: `suaempresa.atlassian.net`, sem `https://`), **e-mail da conta Atlassian** (o mesmo do login que criou o token) e **token**. O token fica guardado no Keychain.
4. Reiniciar a conversa para o MCP subir com os valores novos.
5. Chamar `jira_status` de novo e conferir se o nome que aparece é o da própria pessoa.

## 3. Problemas comuns

| Sintoma | Causa provável |
|---|---|
| 401 do Jira | Token errado ou expirado, ou e-mail diferente do da conta que criou o token. Criar um token novo |
| 404 em um projeto | A conta não tem acesso ao projeto |
| O card saiu com o nome de outra pessoa | O token configurado é de outra pessoa. Trocar pelo token da própria conta |
| `jira_status` mostra outro domínio | Domínio digitado errado na configuração |
| `marketplace add` falha com "not found" ou pede senha | Convite do repositório não aceito, ou `git` sem login no GitHub (Parte A) |
| `claude: command not found` | O Claude Code não está no terminal. Rodar `/plugin marketplace add ...` dentro de uma sessão do Claude Code |

## Regras

- Nunca peça nem repita o token no chat, e não grave o token em arquivo.
- Não use o token de outra pessoa nem um token compartilhado: o reporter perderia o sentido.
