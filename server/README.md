# Servidor MCP do stl-jira-plugin

Servidor MCP (stdio) que o plugin sobe com o token de cada pessoa. O plugin roda o arquivo único `bundle/stl-jira.mjs`; o código está em `src/` e os padrões em `templates/`.

## Credencial
O plugin entrega `JIRA_DOMAIN`, `JIRA_EMAIL` e `JIRA_API_TOKEN` a partir da configuração de cada pessoa (token no Keychain). Cada pessoa usa o próprio token, e o reporter dos cards é o dono dele.

## Comandos
```bash
npm install
npm test            # compila, roda os testes
npm run bundle      # regera bundle/stl-jira.mjs (commitar junto)
npm run bundle:check # falha se o bundle commitado estiver desatualizado
```

## Padrões de abertura de card
Cada tipo de card tem um padrão em `templates/*.json`: `epico`, `user-story`, `bug`, `tarefa`, `spike-refinamento`, `spike-investigacao`.

| Tool / recurso | Para quê |
|---|---|
| `card_template_list` | Lista os padrões e o tipo de issue do Jira de cada um |
| `card_template_get` | Devolve as perguntas de abertura, a regra de título e as seções na ordem. Faça as perguntas antes de escrever o card |
| `card_validate` | Confere o rascunho (`template`, `summary`, `sections`) contra o padrão, sem criar nada. Erros: o card não está pronto. Avisos: não bloqueiam |
| `stl://templates/{id}` | O mesmo padrão em markdown, como recurso do MCP |

### Criação com validação
`jira_create_issue` valida o card contra o padrão antes de criar e **recusa** o que não segue, listando o que falta.

- O padrão sai do tipo de issue (`Story` → `user-story`, `Epic` → `epico`, `Bug` → `bug`, `Task` → `tarefa`).
- `Spike` tem dois padrões: informe `template` (`spike-refinamento` ou `spike-investigacao`).
- Tipo sem padrão (Design, Sub-task...) só cria com `skipValidation: true`, e só com a confirmação da pessoa.
- `dryRun: true` devolve `validation`, `blocker` e o `payload`, sem criar nada.
- Avisos (seção fora de ordem, seção que não existe no template) não bloqueiam e voltam em `warnings`.

`jira_update_issue` ainda não valida.

### Como editar um padrão
Os arquivos de `templates/` são lidos a cada chamada: edite, salve e o MCP já usa a versão nova, sem reiniciar. Para usar outra pasta, defina `STL_TEMPLATES_DIR`.

Cada seção do template aceita:

| Campo | Efeito |
|---|---|
| `heading` ou `headingPattern` | Título exato da seção, ou expressão regular quando há várias (ex.: `^US-\d+`) |
| `required` | A seção é obrigatória |
| `format` | `text`, `actionItems`, `bullets` ou `code` |
| `panel`, `expand` | A seção deve vir em painel (`info`, `note`...) ou dentro de um Expand |
| `minItems`, `minLines`, `minOccurrences`, `minScenarios` | Quantidade mínima de itens, linhas, seções repetidas ou cenários Gherkin |
| `contains`, `containsAny` | Termos que precisam aparecer (todos, ou pelo menos um). A comparação ignora acento e maiúsculas |
| `containsMessage`, `containsAnyMessage`, `containsSeverity` | Mensagem do erro e se a falha é `error` ou `warning` |
| `matches`, `eachBullet` | Expressões regulares sobre o texto da seção ou sobre cada item da lista, com mensagem |

Chaves desconhecidas são rejeitadas ao carregar, para pegar erro de digitação.
Os testes (`npm test`) conferem que todos os templates carregam e que um rascunho completo de cada tipo passa.
