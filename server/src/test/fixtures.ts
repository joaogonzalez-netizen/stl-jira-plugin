import type { Section } from "../adf.js";

export const IDIOMAS = "Funciona em português, espanhol e inglês";

export const GHERKIN = `Cenário: Gerar anúncio a partir da foto
  Dado que o maker enviou a foto do produto
  Quando ele pede a geração
  Então o anúncio aparece pronto para revisar

Cenário: Foto sem produto reconhecível
  Dado que a foto não mostra um produto
  Quando ele pede a geração
  Então o sistema pede outra foto

Esquema do Cenário: Usar a geração em outro idioma
  Dado que o usuário escolheu o idioma <idioma>
  Quando ele pede a geração
  Então todos os textos aparecem em <idioma>
  Exemplos:
    | idioma    |
    | português |
    | espanhol  |
    | inglês    |`;

export const userStory = (): Section[] => [
  { heading: "Caminho e acesso", text: "Caminho: Seller > Gerador de anúncios > Novo anúncio" },
  { heading: "Contexto", text: "O maker já tem produtos cadastrados.\nÉpico: SELLER-120 · move a North Star: download de anúncio" },
  { heading: "Objetivo", text: "Publicar um anúncio sem escrever o texto à mão." },
  {
    heading: "User Story",
    panel: "info",
    text: "Como maker com produtos cadastrados no STLSeller, quero gerar um anúncio a partir da foto para publicar mais rápido",
  },
  { heading: "Critérios de Aceite", actionItems: ["Gera título, tags e descrição", "Pede outra foto se não houver produto", IDIOMAS] },
  { heading: "Gherkin", code: GHERKIN, codeLanguage: "gherkin" },
];

export const epic = (): Section[] => [
  { heading: "Problema/contexto", text: "Makers gastam horas escrevendo anúncios." },
  { heading: "Hipótese", text: "Acreditamos que gerar o anúncio pela foto para makers do Seller vai aumentar os downloads. Saberemos que acertamos quando a taxa subir de 10% para 20%." },
  { heading: "Objetivos", bullets: ["Reduzir o tempo de criação", "Aumentar downloads", "Aumentar postagens"] },
  { heading: "Não-objetivos", bullets: ["Editor de imagem", "Preço automático", "Integração com novos marketplaces"] },
  { heading: "Histórias sugeridas", text: "Persona: maker cadastrado no STLSeller" },
  { heading: "US-01 — Gerar anúncio a partir da foto", actionItems: ["Gera título e descrição", IDIOMAS] },
  { heading: "US-02 — Editar o texto gerado", actionItems: ["Permite editar antes de publicar", IDIOMAS] },
  {
    heading: "US-03 — Experiência nos 3 idiomas",
    actionItems: [
      "Todo texto novo existe em português, espanhol e inglês",
      "Nenhum texto aparece em idioma diferente do selecionado",
      "Datas, números e moeda seguem o formato de cada idioma",
      "O layout não quebra com o texto mais longo de cada idioma",
    ],
  },
  { heading: "Requisitos", text: "P0: gerar o anúncio.\nIdiomas: PT, ES e EN" },
  { heading: "Métricas de sucesso", text: "North Star do produto: download de anúncio em 30 dias\nDownloads | Alvo | 20% | 30 dias\nTickets de suporte | Guarda | não subir | 30 dias" },
  { heading: "Perguntas em aberto", bullets: ["[Dados] Qual a taxa atual? — bloqueante", "[UX] Qual o fluxo atual? — não bloqueante"] },
];

export const bug = (): Section[] => [
  { heading: "Caminho e acesso", text: "Caminho: Flix > Personalizador" },
  { heading: "Contexto", text: "Clientes não conseguem exportar.\nOrigem: https://intercom.example/123" },
  { heading: "Passos para reproduzir", text: "1. Abrir o personalizador\n2. Clicar em exportar" },
  { heading: "Esperado vs atual", text: "Esperado: baixa o arquivo\nAtual: erro 500" },
  { heading: "Ambiente", text: "Produção, Chrome, idioma: todos" },
  { heading: "Impacto", text: "Severidade: Alto\nClientes afetados: 12\nWorkaround: nenhum" },
  { heading: "Evidência", text: "Print em anexo e ID do pedido 8841" },
  { heading: "Critérios de Aceite", actionItems: ["Exporta sem erro", "Não reproduz mais em português, espanhol e inglês", "Teste de regressão adicionado", "Verificado em produção"] },
];

export const task = (): Section[] => [
  { heading: "Objetivo", text: "Mapear o fluxo atual de onboarding." },
  { heading: "Checklist do que precisa ficar pronto", actionItems: ["Fluxo desenhado", "Melhorias propostas"] },
  { heading: "Evidência de conclusão", text: "A preencher ao concluir. Confere: PM." },
];

export const spikeRefinement = (): Section[] => [
  { heading: "Contexto do épico", text: "Gerador de anúncios.\nÉpico: SELLER-120 · North Star: download de anúncio" },
  { heading: "Escopo", text: "Refinar antes de reescrever o prompt." },
  { heading: "Perguntas do épico a responder", text: "Ver Perguntas em aberto do épico." },
  {
    heading: "Checklist de refinamento técnico",
    actionItems: [
      "Definir a quebra do épico em histórias testáveis",
      "Definir pendência ou ajuda de outros desenvolvedores e equipes",
      "Definir tempo estimado em semanas",
      "Mapear integrações e dependências externas",
      "Definir a arquitetura da solução",
      "Levantar regras de negócio com validação automática",
      "Definir como os 3 idiomas serão tratados",
      "Definir os eventos de instrumentação da North Star e da guarda",
    ],
  },
  { heading: "Resultado esperado", actionItems: ["Histórias criadas e linkadas", "Estimativa registrada", "Perguntas respondidas"] },
];

export const spikeInvestigation = (): Section[] => [
  { heading: "Pergunta a responder", text: "Dá para gerar o vídeo no backend em menos de 30 segundos?" },
  { heading: "Timebox", text: "3 dias" },
  { heading: "Opções a avaliar", bullets: ["Fila com worker dedicado", "Geração sob demanda"] },
  { heading: "Saída esperada", text: "Decisão registrada no Confluence." },
  { heading: "Critério de encerramento", actionItems: ["Pergunta respondida", "Decisão registrada"] },
];
