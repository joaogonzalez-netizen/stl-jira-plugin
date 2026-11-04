---
name: jira-task
description: >-
  Abre um card no Jira no padrão da STLFLIX: épico (PRD), user story, bug, tarefa ou spike. Use sempre que a pessoa pedir para criar uma task, card ou issue no Jira, registrar algo no Jira, escrever uma user story, um PRD ou épico, reportar um bug, abrir uma spike, ou chamar /jira-task. Faz as perguntas de abertura, escreve o card, valida contra o padrão e só cria depois da confirmação.
---

# Jira Task

Abre cards no Jira pelas ferramentas do MCP `stl-jira`. O padrão de cada tipo mora nos templates do MCP: **não reescreva a estrutura aqui**, leia-a com `card_template_get`. O card sai no nome de quem está usando o plugin, porque o reporter é o dono do token.

## 0. Conferir a conexão

Chame `jira_status`. Se `configured` for falso ou a validação falhar, pare e use a skill `configurar-jira`. Nunca peça o token no chat.

## 1. Descobrir o tipo de card

Se a pessoa não disse, pergunte (use `AskUserQuestion`). Para ajudar a escolher:

| Tipo | Quando | Template |
|---|---|---|
| Épico (PRD) | Uma iniciativa com problema, hipótese, métricas e várias histórias | `epico` |
| User Story | Algo novo que o usuário vê ou faz | `user-story` |
| Bug | Comportamento errado em algo que já existe | `bug` |
| Tarefa | Trabalho sem feature nova, técnico ou operacional (análise, documentação, ajuste manual, configuração) | `tarefa` |
| Spike | Refinar um épico ou investigar uma pergunta técnica | `spike-refinamento` ou `spike-investigacao` |

Se o pedido cria funcionalidade nova, não é Tarefa: é User Story.

## 2. Ler o padrão e fazer as perguntas

Chame `card_template_get` com o id do template. Ele devolve `questions` (perguntas de abertura), `title` (regra do título) e `sections` (as seções, na ordem, com a dica de cada uma).

**Sempre faça as perguntas antes de escrever**, em conversa curta, e só as que ainda não foram respondidas. Aproveite tudo que já veio na conversa. Use `AskUserQuestion` quando as respostas são escolhas fechadas.

Regras que valem para qualquer card:
- Todo produto (Flix, Academy, Seller, IA) existe em português, espanhol e inglês. Os templates já trazem o critério de idiomas: não o remova.
- A North Star de cada produto, na janela de 30 dias: Flix = download de modelo ou envio ao fatiador; IA = downloads de geração; Seller = download e postagem de anúncio do gerador; Academy = 50% do curso em 30 dias após a matrícula.
- Não invente dado. Se falta informação, pergunte.

## 3. Projeto e tipo de issue

Chame `jira_list_projects` e confirme o projeto com a pessoa. Chame `jira_list_issue_types` para conferir o nome do tipo (Story, Bug, Task, Epic, Spike). Se o tipo não existir no projeto, avise e pergunte o que fazer.

## 4. Escrever e validar

Monte `summary` e `sections` seguindo o template: cada seção com o `heading` exato, na ordem. O formato de cada seção (`text`, `actionItems`, `bullets`, `code`, painel, Expand) vem do template.

Chame `card_validate` com o `template`, o `summary` e as `sections`. Se houver `errors`, corrija e valide de novo, sem pedir licença à pessoa para cada ajuste. Mostre os `warnings` no preview.

## 5. Preview e perguntas finais

Mostre o card como texto na conversa (não como artifact), no formato:

```
### [Tipo] · Projeto [KEY]
**Título:** ...

[seções na ordem]
```

Depois pergunte, só o que se aplica:
- Se for User Story: **"Quer que eu adicione cenários de teste para ajudar o QA?"** Se sim, acrescente a seção `Cenários de teste` (tabela com ID, tipo, passos e dados, resultado esperado) e valide de novo.
- A história ficou grande demais? Algum caso de borda a mais? Algum termo vago ("rápido", "fácil") para definir?
- Quer anexar um print?
- **"Pode criar assim, ou quer ajustar algo?"**

**Só crie depois de uma confirmação explícita.** Se pedirem ajuste, refaça o preview e pergunte de novo.

## 6. Criar

Chame `jira_create_issue` com `projectKey`, `issueType`, `summary`, `sections` e, para Spike, o `template`. Crie um card de cada vez e mostre o link assim que sair, com o `reporter` que a ferramenta devolve.

- Se a criação for recusada, mostre o que falta e volte ao passo 4. Não use `skipValidation` por conta própria: só com o pedido explícito da pessoa, e só para tipos sem padrão (Design, Sub-task).
- Se a pessoa quer um print anexado, depois de criar use `jira_attach_file` com o arquivo.

## 7. Épico com histórias sugeridas

Depois de criar um épico, ofereça criar cada história sugerida como User Story separada, repetindo este fluxo. A linha `Épico: [chave]` no Contexto de cada história aponta para o épico. O vínculo formal de épico pai ainda não existe no MCP: diga isso se perguntarem.

## Resumo final

Liste os cards criados com o link (`[ABC-123](https://dominio/browse/ABC-123)`) e o reporter.
