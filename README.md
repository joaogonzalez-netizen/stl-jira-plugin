# stl-jira-plugin

Plugin do Claude para abrir cards no Jira no padrão da STLFLIX: **épico (PRD), user story, bug, tarefa e spike**. Faz as perguntas de abertura, valida o card contra o padrão e só cria depois da confirmação. O card sai **no nome de quem está usando**: cada pessoa configura o próprio token, e o reporter é o dono do token.

## Instalar (passo a passo)

### 1. GitHub
O repositório é `joaogonzalez-netizen/stl-jira-plugin`. Se ele estiver privado:
1. Aceite o convite de colaborador (e-mail ou https://github.com/notifications).
2. Instale o GitHub CLI (https://cli.github.com) e rode `gh auth login` (HTTPS, login pelo navegador). Alternativa: uma chave SSH em https://github.com/settings/keys.
3. Confira: `git ls-remote https://github.com/joaogonzalez-netizen/stl-jira-plugin.git` deve listar commits.

### 2. Instalar o plugin
No terminal:
```bash
claude plugin marketplace add joaogonzalez-netizen/stl-jira-plugin
claude plugin install stl-jira-plugin@stl-jira
```
Ou, dentro do Claude Code: `/plugin marketplace add joaogonzalez-netizen/stl-jira-plugin` e `/plugin install stl-jira-plugin@stl-jira`. O `/plugin` não existe no terminal comum, só dentro do Claude Code.

### 3. Token do Jira
1. Abra https://id.atlassian.com/manage-profile/security/api-tokens com o login da **sua** conta e clique em **Create API token**.
2. Dê um nome como "Claude" e crie. Copie o token na hora: ele só aparece uma vez.
3. Na instalação o plugin pede três valores. Nenhum é compartilhado:

| Campo | O que colocar |
|---|---|
| Domínio do Jira | `suaempresa.atlassian.net`, sem `https://` |
| Seu e-mail do Jira | O e-mail da conta Atlassian que criou o token |
| Seu token de API | O token do passo 2. Fica no Keychain |

### 4. Conferir
Reinicie a conversa e peça "confere meu Jira" (skill `configurar-jira`). O `jira_status` deve mostrar o seu nome. Depois, peça `/stl-jira-plugin:jira-task` ou diga "cria uma user story".

## O que vem no plugin
| Peça | Papel |
|---|---|
| `skills/jira-task` | Conversa: descobre o tipo, faz as perguntas, escreve, valida, mostra o preview e cria |
| `skills/configurar-jira` | Ajuda a conectar a conta de cada pessoa |
| `server/` | Servidor MCP `stl-jira`: templates, `card_validate` e criação no Jira |
| `server/templates/*.json` | O padrão de cada tipo de card. É aqui que se edita o padrão |

As skills são finas de propósito: o padrão mora só nos templates, em um lugar.

## Ferramentas do MCP
`jira_status` (mostra em nome de quem está conectado), `jira_list_projects`, `jira_list_issue_types`, `jira_create_issue`, `jira_update_issue`, `jira_attach_file`, `card_template_list`, `card_template_get`, `card_validate`, e os recursos `stl://templates/{id}`.

`jira_create_issue` valida o card e **recusa** o que não segue o padrão, listando o que falta. Tipo sem padrão (Design, Sub-task) só cria com `skipValidation: true`. O resultado traz o `reporter`.

## Manter
1. Para mudar um padrão, edite `server/templates/<tipo>.json`. As regras de cada campo estão em `server/README.md`.
2. Para mudar o código, edite `server/src` e rode os testes.
3. **Regere o bundle antes de commitar**, porque o plugin roda o arquivo único `server/bundle/stl-jira.mjs`, sem `node_modules`:
```bash
npm --prefix server run bundle
```
4. Suba a versão em `.claude-plugin/plugin.json` para o time receber a atualização.

```bash
npm install --prefix server   # só na primeira vez
npm test                      # typecheck, testes e conferência do bundle
```
`npm test` falha se o bundle commitado estiver desatualizado em relação ao código.

## Limitações conhecidas
- Não há vínculo formal de épico pai ao criar uma história: a história cita o épico no Contexto.
- `jira_update_issue` não valida contra o padrão.
- Não há registro de projetos, apelidos nem link e senha de app para o "Caminho e acesso": a skill pergunta.
