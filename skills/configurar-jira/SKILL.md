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

Oriente, sem pedir o token no chat:

1. Abrir https://id.atlassian.com/manage-profile/security/api-tokens e criar um token com o próprio login, com um nome como "Claude".
2. Abrir a configuração do plugin `stl-jira-plugin` e preencher **domínio do Jira** (ex.: `suaempresa.atlassian.net`, sem `https://`), **e-mail da conta Atlassian** e **token**. O token fica guardado no Keychain.
3. Reiniciar a conversa para o MCP subir com os valores novos.
4. Chamar `jira_status` de novo.

## 3. Problemas comuns

| Sintoma | Causa provável |
|---|---|
| 401 do Jira | Token errado ou expirado, ou e-mail diferente do da conta que criou o token. Criar um token novo |
| 404 em um projeto | A conta não tem acesso ao projeto |
| O card saiu com o nome de outra pessoa | O token configurado é de outra pessoa. Trocar pelo token da própria conta |
| `jira_status` mostra outro domínio | Domínio digitado errado na configuração |

## Regras

- Nunca peça nem repita o token no chat, e não grave o token em arquivo.
- Não use o token de outra pessoa nem um token compartilhado: o reporter perderia o sentido.
