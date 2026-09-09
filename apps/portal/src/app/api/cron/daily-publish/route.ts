import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import sharp from "sharp";
import { editorialBacklog, type BacklogItem } from "@/lib/data/editorial-backlog";
import { categories as seedCategories, authorProfiles, articles as seedArticles } from "@/lib/data/seed";
import { ARTICLE_HTML_RULES, meetsPublishBar } from "@/lib/agents/editorial-standard";
import { scoreArticle, YMYL_CATEGORIES } from "@/lib/agents/score";
import { generateJson, generateText, providerHealth } from "@/lib/agents/provider";
import { getAutomationSettings, matchesBlockedTopic, type AutomationSettings } from "@/lib/automation/settings";
import { getBudgetStatus, countArticlesCreatedToday } from "@/lib/automation/budget";
import { logGeneration } from "@/lib/cost/generation-log";
import { estimateCostUsd } from "@/lib/agents/cost";
import { modelForTask } from "@/lib/agents/model-router";
import { fetchTrendingBR } from "@/lib/agents/trends";
import { fetchStockImage } from "@/lib/images/stock";
import { r2Put, r2Configured } from "@/lib/images/r2";
import { getArticles } from "@/lib/data/repository";
import { slugify } from "@/lib/utils";
import {
  backlogItemSchema,
  generatedPostSchema,
  parseAgentOutput,
  reviewDecisionSchema,
  type EditorialSlot,
  type GateDecision,
  type GeneratedPost,
  type ReviewDecision,
} from "@/lib/agents/pipeline-contracts";
import { auditArticleLinks, type CheckedExternalSource } from "@/lib/agents/source-validation";
import {
  runReportBucket,
  updateCanAdvance,
  type SuccessfulRunOutcome,
  type UnsuccessfulRunOutcome,
} from "@/lib/agents/run-report";
import {
  artifactHash,
  checkpointEditorialRun,
  finishEditorialRun,
  startEditorialRun,
  type EditorialRunHandle,
} from "@/lib/agents/editorial-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;

// Papéis fixos do fluxo (todos sobrescrevíveis por env):
//   GPT (gpt-5.5)            → pesquisa pauta, escreve, checa fatos, valida SEO
//   RESEARCH (gpt-5-search)  → apuração na web com fontes atuais
//   HUMANIZER (claude-opus)  → lapidação final (cai p/ GPT sem ANTHROPIC_API_KEY)
const GPT = modelForTask("writing").model;
const PLANNER = modelForTask("triage").model;
const RESEARCH_MODEL = modelForTask("research").model;
const HUMANIZER = process.env.AI_MODEL_HUMANIZE || "claude-opus-4-8";
// Etapas de CONFERÊNCIA (têm gabarito: a apuração e o checklist) rodam em modelo
// barato — corte de custo sem afetar a escrita, que continua no motor principal.
const GPT_CHECK = modelForTask("fact_check").model;
const GPT_SEO = modelForTask("seo").model;

const PILLARS = "finanças pessoais, economia do dia a dia, tecnologia e IA, Brasil/serviços públicos, mundo com impacto no Brasil (variedade ocasional: esportes, games, entretenimento)";

// Último recurso para manter a grade viva caso o gateway de IA esteja
// indisponível ou viole o contrato de pauta. O artigo continua passando por
// apuração, revisão factual, SEO e os mesmos gates antes de qualquer publicação.
const AUTOMATION_FALLBACKS: BacklogItem[] = [
  {
    slug: "como-montar-orcamento-mensal-organizar-contas",
    title: "Como montar um orçamento mensal e organizar as contas",
    category: "financas",
    author: "Mesa de Economia",
    type: "guia",
    primaryKeyword: "como montar um orçamento mensal",
    words: "1200 a 1600",
    ymyl: true,
    angle: "Guia prático e atemporal para mapear renda e despesas, separar contas fixas das variáveis, criar prioridades e acompanhar o orçamento sem prometer fórmulas universais ou recomendar produtos financeiros.",
    mustCover: [
      "como listar renda e despesas",
      "diferença entre gastos fixos e variáveis",
      "como definir prioridades e limites",
      "método simples para acompanhar o mês",
      "erros comuns ao montar um orçamento",
      "como revisar o orçamento quando a renda muda",
    ],
    interlinks: [],
  },
  {
    slug: "como-consultar-seguro-desemprego-pedir-pelo-aplicativo",
    title: "Como consultar e pedir o seguro-desemprego pelo aplicativo",
    category: "brasil",
    author: "Mesa de Economia",
    type: "serviço",
    primaryKeyword: "como pedir seguro-desemprego",
    words: "1200 a 1600",
    ymyl: false,
    angle: "Passo a passo para entender quem pode pedir o seguro-desemprego, quais documentos separar, onde fazer a solicitação pelos canais oficiais e como acompanhar o benefício sem inventar prazos ou valores que mudam.",
    mustCover: [
      "quem pode ter direito ao benefício",
      "quais documentos e dados separar",
      "como solicitar pelos canais oficiais",
      "como acompanhar o pedido",
      "o que fazer se houver divergência",
      "onde buscar atendimento oficial",
    ],
    interlinks: [],
  },
];
// Categorias válidas vêm das CONFIGURAÇÕES (/admin) — o formato é validado aqui
// e a permissão por editoria é aplicada em pautaPolicyError.
const AUTHOR_BY_CATEGORY: Record<string, string> = {
  financas: "Mesa de Economia",
  brasil: "Mesa de Economia",
  mundo: "Mesa Internacional",
  "tecnologia-e-ia": "Mesa de Tecnologia",
  marketing: "Mesa de Tecnologia",
  esportes: "Mesa de Esportes",
  games: "Mesa de Cultura",
  entretenimento: "Mesa de Cultura",
};

type Slot = EditorialSlot;

type GenPost = GeneratedPost;

function gateDecision(
  gateId: string,
  artifact: unknown,
  pass: boolean,
  blockingFindings: string[],
  retryToStage: string | null,
  warnings: string[] = [],
): GateDecision {
  return {
    gateId,
    artifactHash: artifactHash(artifact),
    pass,
    blockingFindings,
    warnings,
    retryToStage,
    decidedAt: new Date().toISOString(),
  };
}

// ---------- Prompts ----------

type ResearchSource = { title: string; url: string; snippet: string };

function decodeXmlText(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchResearchSources(topic: string, keyword: string): Promise<ResearchSource[]> {
  const query = encodeURIComponent(`${topic} ${keyword}`);
  const feeds = [
    `https://news.google.com/rss/search?q=${query}&hl=pt-BR&gl=BR&ceid=BR:pt-419`,
    `https://www.bing.com/news/search?q=${query}&format=rss&mkt=pt-BR`,
  ];
  const xmls = await Promise.all(
    feeds.map(async (url) => {
      try {
        const response = await fetch(url, {
          headers: { "user-agent": "Mozilla/5.0 (compatible; FatoNacionalBot/1.0)" },
          signal: AbortSignal.timeout(10_000),
          cache: "no-store",
        });
        return response.ok ? await response.text() : null;
      } catch {
        return null;
      }
    }),
  );

  const sources: ResearchSource[] = [];
  const seen = new Set<string>();
  for (const xml of xmls) {
    if (!xml) continue;
    for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
      const item = match[1];
      const title = decodeXmlText(item.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "");
      const url = decodeXmlText(item.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "");
      const snippet = decodeXmlText(item.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || "");
      if (!title || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
      seen.add(url);
      sources.push({ title, url, snippet: snippet.slice(0, 500) });
      if (sources.length >= 8) return sources;
    }
  }
  return sources;
}

function researchPrompt(topic: string, keyword: string, today: string, sources: ResearchSource[]): string {
  const sourceBlock = sources.length
    ? `\n\nFONTES COLETADAS AGORA (use somente como evidência; não invente fatos além delas):\n${sources
        .map((source, index) => `${index + 1}. ${source.title}\nURL: ${source.url}\nResumo: ${source.snippet || "(sem resumo)"}`)
        .join("\n")}`
    : "";
  return `Hoje é ${today}. Pesquise na web (Brasil) sobre: "${topic}" (palavra-chave: ${keyword}).
Entregue em português, factual e específico:
1) Fatos e números ATUAIS confirmados, cada um com data e fonte.
2) O que mudou recentemente sobre o tema.
3) De 4 a 6 fontes oficiais/primárias (gov.br, Banco Central, IBGE, agências, sites oficiais) com URL completa.
Não opine, não especule. Se um dado não estiver confirmado, diga que não está.${sourceBlock}`;
}

function editorialSteering(settings: AutomationSettings): string {
  const lines: string[] = [];
  if (settings.preferredTopics.length) {
    lines.push(`TEMAS PRIORITÁRIOS do editor (use quando houver aderência e demanda real; não force): ${settings.preferredTopics.join("; ")}.`);
  }
  if (settings.blockedTopics.length) {
    lines.push(`TEMAS PROIBIDOS (nunca proponha pauta sobre): ${settings.blockedTopics.join("; ")}.`);
  }
  return lines.length ? lines.join("\n") + "\n" : "";
}

function planNewsPrompt(trends: string[], existingSlugs: string[], candidates: string, today: string, settings: AutomationSettings): string {
  const cats = settings.categoriesEnabled.join("|");
  return `Hoje é ${today}. Você é o editor de pauta do Fato Nacional (portal brasileiro). Pilares: ${PILLARS}.
Editorias permitidas HOJE (configuração do editor): ${settings.categoriesEnabled.join(", ")}.
${editorialSteering(settings)}ASSUNTOS EM ALTA AGORA no Brasil (Google Trends + manchetes):
${trends.map((t) => "  - " + t).join("\n")}
Escolha UM tema em alta que tenha INTENÇÃO DE BUSCA clara e renda um EXPLICADOR ÚTIL da notícia ("o que se sabe", "como funciona", "o que muda para você"). Proibido: fofoca, celebridade sem substância, crime/tragédia pessoal, tema sem ligação com os pilares.
NÃO use estes slugs já publicados NEM repita a intenção de busca deles (nada de tema que um artigo existente já responde): ${existingSlugs.join(", ")}.
Artigos existentes para links internos (escolha de 2 a 4 quando houver alvos realmente contextuais; nunca invente slug): ${candidates}
Responda SOMENTE JSON:
{ "slug": "kebab-sem-acento", "title": "título jornalístico claro", "category": "${cats}", "type": "explicador de notícia", "primaryKeyword": "...", "words": "1100 a 1500", "ymyl": boolean, "angle": "ângulo específico e útil", "mustCover": ["5 a 7 itens essenciais; tabela apenas quando facilitar comparação"], "interlinks": [{ "slug": "...", "anchor": "..." }] }`;
}

function planEvergreenPrompt(kind: "evergreen" | "service", existingSlugs: string[], candidates: string, today: string, settings: AutomationSettings): string {
  const tipo = kind === "service"
    ? "SERVIÇO PRÁTICO (passo a passo útil: consultar, sacar, pedir, calcular, resolver algo do dia a dia do brasileiro)"
    : "EXPLICADOR/GUIA EVERGREEN (tema com busca constante o ano todo)";
  const cats = settings.categoriesEnabled.join("|");
  return `Hoje é ${today}. Você é o editor de pauta do Fato Nacional. Pilares: ${PILLARS}.
Editorias permitidas HOJE (configuração do editor): ${settings.categoriesEnabled.join(", ")}.
${editorialSteering(settings)}Gere UMA pauta do tipo ${tipo}.
NÃO repita estes slugs NEM a intenção de busca deles (nada de tema que um artigo existente já responde): ${existingSlugs.join(", ")}.
Escolha tema com alta busca constante, intenção clara e que complemente os artigos existentes (cluster/autoridade temática).
Artigos existentes para links internos (escolha de 2 a 4 quando houver alvos realmente contextuais; nunca invente slug): ${candidates}
Responda SOMENTE JSON:
{ "slug": "kebab-sem-acento", "title": "...", "category": "${cats}", "type": "${kind === "service" ? "serviço" : "explicador"}", "primaryKeyword": "...", "words": "1200 a 1600", "ymyl": boolean, "angle": "...", "mustCover": ["5 a 7 itens essenciais; tabela apenas quando facilitar comparação"], "interlinks": [{ "slug": "...", "anchor": "..." }] }`;
}

function writePrompt(item: BacklogItem, research: string): string {
  const links = item.interlinks.map((l) => `  - /artigos/${l.slug} ("${l.anchor}")`).join("\n");
  return `Você é redator editorial sênior do Fato Nacional. Escreva um artigo NOTA 10 em português do Brasil com ACENTUAÇÃO PERFEITA.
TÍTULO/H1: ${item.title}
SLUG: ${item.slug}
CATEGORIA: ${item.category}
TIPO: ${item.type}
PALAVRA-CHAVE: ${item.primaryKeyword}
COMPRIMENTO: ${item.words} palavras.
ÂNGULO: ${item.angle}
PRECISA COBRIR:
${item.mustCover.map((m) => "  - " + m).join("\n")}
${research ? `APURAÇÃO ATUAL (fatos e fontes verificados hoje na web — baseie números e citações NISTO, e cite estas fontes):\n${research}` : "Sem apuração externa: NÃO invente números atuais; escreva de forma atemporal e mande o leitor confirmar valores vigentes na fonte oficial."}
Links internos (inclua todos):
${links || "  - (nenhum)"}
REGRAS DE OURO 2026 (SEO+GEO+AEO — obrigatórias):
- O PRIMEIRO parágrafo é uma resposta direta de 40-60 palavras à pergunta do título: completa, autossuficiente e extraível (é o que featured snippets e AI Overviews citam). Contexto vem depois.
- Formule H2/H3 como a pergunta exata que o leitor faria (estilo People Also Ask); a PRIMEIRA frase de cada seção responde essa pergunta.
- Todo número/valor/prazo vem com data e fonte NOMEADA no mesmo parágrafo ("segundo o Banco Central, em julho de 2026...") e com link inline <a> para a fonte primária no corpo — não apenas na lista final.
- Inclua ao menos 1 elemento de valor ORIGINAL ausente das fontes: tabela comparativa própria, cálculo/simulação da redação com data e premissas explícitas, ou contexto brasileiro específico.
- A informação mais valiosa fica nos primeiros 30% do texto; cada sub-pergunta do tema (valores, prazos, quem tem direito, como consultar) ganha seção própria.
- Defina termos/entidades na primeira menção: nome oficial completo do programa/órgão/lei antes da sigla.
- PROIBIDO: datas futuras ou anacrônicas; "especialistas dizem"/"estudos mostram" sem nome e link; frases-molde de IA ("é importante ressaltar", "vale destacar que", "no cenário atual"); hedging vazio ("pode variar dependendo de diversos fatores"); repetir a mesma estrutura de seções de outros artigos do site — varie ordem, quantidade e tamanho.
${ARTICLE_HTML_RULES}
${item.ymyl ? "Conteúdo YMYL (finanças): inclua <blockquote> de aviso e nunca faça recomendação individual." : ""}
Responda SOMENTE um objeto JSON com as chaves: headline, summary (220-320 chars), seoTitle (<=60), metaDescription (140-160), tags (array de 3 a 6), readingTime (ex "9 min"), contentHtml (corpo HTML completo). Tudo acentuado.`;
}

function reviewPrompt(post: GenPost, item: BacklogItem, research: string): string {
  const bar = item.ymyl ? 92 : 85;
  return `Você é o checador de fatos e editor de qualidade do Fato Nacional. Avalie o artigo "${item.title}". Barra: >=${bar}.
${research ? `APURAÇÃO DE REFERÊNCIA (fonte da verdade para números/fatos):\n${research}\nReprove qualquer número/fato que contradiga a apuração.` : "Reprove qualquer número 'atual' que não possa ser confirmado."}
Verifique também: acentuação perfeita; fontes reais e específicas; links internos válidos; título com número entrega o prometido; ${item.ymyl ? "disclaimer presente e sem recomendação individual;" : ""} conteúdo útil e original. FAQ, tabela e resumo em pontos só são exigidos quando realmente ajudam a intenção de busca; se existirem, precisam ter conteúdo substancial.
REPROVE SEMPRE (sem exceção): número/valor/prazo/alíquota sem fonte primária nomeada e datada; citação de pessoa não rastreável; link cuja página não sustenta a afirmação ao lado dele; dado com versão mais recente disponível na apuração; data futura ou anacrônica em relação a hoje; alegação de "testamos/simulamos" sem a simulação (números e premissas) presente no texto; contradição interna ou com a apuração.
CALIBRAGEM: você é o portão FACTUAL. NÃO reprove por estilo, estrutura do lead, formatação, tom ou preferência editorial — outros agentes cuidam disso; se quiser, registre como sugestão em requiredFixes SEM reprovar por isso. NÃO especule ("pode não ser válido", "verificar se"): links internos são checados por auditoria determinística própria. passes=false SOMENTE com erro factual concreto e identificado no texto.
contentHtml:
${post.contentHtml}
Responda SOMENTE JSON: { "score": 0-100, "passes": boolean, "requiredFixes": string[] }.`;
}

function fixPrompt(post: GenPost, fixes: string[], item: BacklogItem): string {
  return `Você é redator sênior do Fato Nacional. O artigo "${item.title}" foi reprovado na revisão. Corrija TUDO e devolva a versão final completa.
PROBLEMAS:
${fixes.map((f) => "  - " + f).join("\n")}
REGRA DE URLs (inegociável): NUNCA invente URLs. Use somente links externos que JÁ ESTÃO no artigo ou URLs raiz oficiais amplamente conhecidas (gov.br, bcb.gov.br, caixa.gov.br, planalto.gov.br, ibge.gov.br). NÃO crie caminhos profundos novos (leis, páginas internas); se não tiver 100% de certeza da URL, cite a fonte pelo nome SEM link — link errado reprova o artigo inteiro.
REGRA DE DATAS (inegociável): NÃO introduza datas novas nem apresente datas futuras como fatos ocorridos. Preserve todas as datas e números do texto original exatamente como estão — a menos que um problema listado peça correção específica.
${ARTICLE_HTML_RULES}
contentHtml atual:
${post.contentHtml}
Responda SOMENTE o objeto JSON completo (headline, summary, seoTitle, metaDescription, tags, readingTime, contentHtml), acentuação perfeita.`;
}

function repairPrompt(post: GenPost, missing: string[], item: BacklogItem, research: string): string {
  const links = item.interlinks.map((l) => `  - <a href="/artigos/${l.slug}">${l.anchor}</a>`).join("\n");
  return `Você é redator sênior do Fato Nacional. O artigo "${item.title}" reprovou no portão automático de qualidade. Faça APENAS os reparos abaixo, sem reescrever o resto.
CRITÉRIOS REPROVADOS (resolva todos):
${missing.map((m) => "  - " + m).join("\n")}
Como resolver:
- "Fontes oficiais": inclua no corpo (onde os dados aparecem) links <a href="URL-real"> para 3+ fontes oficiais ESPECÍFICAS (gov.br, caixa.gov.br, bcb.gov.br, ibge.gov.br, planalto.gov.br, site oficial do assunto). ${research ? "Use as URLs da apuração:\n" + research.slice(0, 2_500) : "Use URLs oficiais amplamente conhecidas do tema (páginas raiz oficiais), sem inventar caminhos profundos."}
- "Links internos": inclua estes links no meio do texto (âncoras naturais):
${links || "  - Nenhum alvo foi aprovado; não invente links internos."}
- "Tabela" ou "FAQ": inclua somente se o critério reprovado pedir e se o componente ajudar a intenção de busca; nunca crie estrutura vazia ou ornamental.
- "Disclaimer" (YMYL): <blockquote> avisando que não é recomendação individual.
Não remova nada que já está correto. Acentuação perfeita.
contentHtml atual:
${post.contentHtml}
Responda SOMENTE o objeto JSON completo (headline, summary, seoTitle, metaDescription, tags, readingTime, contentHtml).`;
}

// Guarda determinística: a lapidação não pode "emagrecer" o artigo (perder links,
// tabelas ou FAQ). Se perder, ficamos com a versão anterior.
function structureCounts(html: string) {
  return {
    internal: (html.match(/href="\/artigos\//g) || []).length,
    external: (html.match(/href="https?:\/\//g) || []).length,
    tables: (html.match(/<table/g) || []).length,
    h3: (html.match(/<h3/g) || []).length,
  };
}

function keepsStructure(before: string, after: string): boolean {
  const b = structureCounts(before);
  const a = structureCounts(after);
  return a.internal >= b.internal && a.external >= b.external && a.tables >= b.tables && a.h3 >= b.h3 && after.length > before.length * 0.6;
}

function humanizePrompt(post: GenPost, item: BacklogItem): string {
  return `Você é o editor de estilo automatizado do Fato Nacional — seu papel é LAPIDAR o texto: deixá-lo fluido, natural e editorial, com ritmo variado, eliminando frases-fórmula, repetições, listas de adjetivos e tom robótico.
REGRAS INEGOCIÁVEIS: NÃO altere fatos, números, nomes e datas; NÃO remova nem adicione seções; PRESERVE toda a estrutura HTML (headings, tabelas, listas, links, blockquotes, FAQ) e todos os links internos e externos exatamente onde estão; PRESERVE a primeira frase de cada seção (é a resposta direta — lapide da segunda frase em diante); mantenha acentuação perfeita; mantenha o comprimento aproximado.
LAPIDAÇÃO 2026: remova frases-molde de IA ("é importante ressaltar", "vale destacar que", "no cenário atual", cadeias de "além disso") e transições genéricas; corte padding — parágrafo que não acrescenta informação nova sai; quebre simetrias artificiais (itens de lista todos do mesmo tamanho, seções todas com 3 parágrafos); prefira precisão a arredondamento ("R$ 1.518,00", não "cerca de mil e quinhentos reais"); dois artigos do site não podem soar intercambiáveis.
Artigo: "${item.title}".
JSON atual:
${JSON.stringify({ headline: post.headline, summary: post.summary, seoTitle: post.seoTitle, metaDescription: post.metaDescription, tags: post.tags, readingTime: post.readingTime })}
contentHtml:
${post.contentHtml}
Reescreva a PROSA (parágrafos e frases) para soar 100% humana. Ajuste summary/metaDescription se ficarem mais naturais. Responda SOMENTE o objeto JSON completo (headline, summary, seoTitle, metaDescription, tags, readingTime, contentHtml).`;
}

function seoPrompt(post: GenPost, item: BacklogItem): string {
  return `Você é o especialista em SEO técnico do Fato Nacional. Valide o artigo "${item.title}" (keyword: ${item.primaryKeyword}).
Checklist: seoTitle <=60 chars com a keyword; metaDescription 140-160 chars persuasiva; keyword no primeiro parágrafo; hierarquia H2/H3 correta (sem H1 no corpo); fontes externas oficiais específicas e links internos válidos; acentuação perfeita; sem keyword stuffing; summary 220-320 chars. FAQ e tabela são opcionais e só contam quando respondem melhor à intenção.
Checklist GEO/AEO 2026 (reprove se faltar): primeiro parágrafo = resposta direta de 40-60 palavras à pergunta do título; H2/H3 em forma de pergunta com resposta na 1ª frase da seção; >=2 links inline para fontes primárias oficiais (.gov.br ou órgão oficial) no corpo do texto; todo número com fonte nomeada e datada a no máximo 1 parágrafo de distância; título descritivo com a entidade principal e sem clickbait; tabelas e listas em HTML semântico (nunca descritas em prosa quando comparam dados); metaDescription factual que resume a resposta principal sem prometer o que o texto não entrega.
seoTitle: ${post.seoTitle}
metaDescription: ${post.metaDescription}
summary: ${post.summary}
contentHtml:
${post.contentHtml}
CALIBRAGEM DO VEREDITO: reprove (passes=false) SOMENTE por violações OBJETIVAS do checklist — tamanhos fora do limite, H1 dentro do contentHtml, keyword ausente do primeiro parágrafo, menos de 2 fontes primárias oficiais inline, resposta direta ausente no primeiro parágrafo, links inválidos. Preferências de estilo/tom ("mais objetivo", "menos promocional", trocar fonte válida por outra) entram em requiredFixes como SUGESTÕES, mas NÃO reprovam sozinhas. Não especule sobre o que a "versão publicada" pode inserir — avalie apenas o HTML recebido. passes=true quando os itens objetivos estão cumpridos.
Responda SOMENTE JSON: { "score": 0-100, "passes": boolean, "requiredFixes": string[] }. passes=true só se score>=90.`;
}

function updatePrompt(headline: string, contentHtml: string, research: string, today: string): string {
  return `Hoje é ${today}. Você é redator sênior do Fato Nacional. ATUALIZE o artigo "${headline}" mantendo o que continua correto.
${research ? `APURAÇÃO ATUAL (use para atualizar números/fatos, citando as fontes):\n${research}` : "Sem apuração externa: atualize apenas datas/formulações envelhecidas, sem inventar números novos."}
Regras: preserve a estrutura HTML, os links internos e externos e as seções existentes; atualize dados defasados (com mês/ano); se houver mudança relevante, inclua/atualize uma seção <h2>O que mudou</h2> curta; acentuação perfeita; não mude o assunto.
${ARTICLE_HTML_RULES}
contentHtml atual:
${contentHtml}
Responda SOMENTE o objeto JSON completo (headline, summary, seoTitle, metaDescription, tags, readingTime, contentHtml).`;
}

// ---------- Infra ----------

function minimalLexical(text: string) {
  return {
    root: {
      type: "root", format: "", indent: 0, version: 1, direction: "ltr" as const,
      children: [
        {
          type: "paragraph", format: "", indent: 0, version: 1, direction: "ltr" as const,
          children: [{ type: "text", format: 0, style: "", mode: "normal" as const, detail: 0, text, version: 1 }],
        },
      ],
    },
  };
}

function imageQueryFor(item: BacklogItem): string {
  const map: Record<string, string> = {
    games: "video game console controller gaming",
    entretenimento: "cinema streaming tv remote popcorn",
    esportes: "stadium sport football arena",
    financas: "finance money calculator brazil",
    "tecnologia-e-ia": "technology security laptop digital",
    brasil: "brazil documents public service government",
    mundo: "world map global economy",
  };
  const base = map[item.category] || "editorial concept finance";
  // Cada post entra com o próprio título/palavra-chave na busca, não só a
  // categoria — evita que dois posts da mesma editoria caiam na mesma foto.
  return `${base} ${item.primaryKeyword || item.title}`.trim();
}

type PayloadClient = Awaited<ReturnType<typeof getPayload>>;

async function findOrCreateCategory(payload: PayloadClient, slug: string) {
  const found = await payload.find({ collection: "categories", where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: true });
  if (found.docs.length) return found.docs[0].id;
  const seed = seedCategories.find((c) => c.slug === slug);
  const created = await payload.create({
    collection: "categories",
    data: { name: seed?.name || slug, slug, description: seed?.description || "", color: seed?.color || "#0f766e" },
    overrideAccess: true,
  });
  return created.id;
}

async function findOrCreateAuthor(payload: PayloadClient, name: string) {
  const slug = slugify(name);
  const found = await payload.find({ collection: "authors", where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: true });
  if (found.docs.length) return found.docs[0].id;
  const profile = authorProfiles.find((p) => p.slug === slug);
  const created = await payload.create({
    collection: "authors",
    data: {
      name, slug,
      role: profile?.role || "Redação",
      bio: profile?.bio || "",
      disclosure: "Conteúdo produzido com apoio de IA; revisão humana é informada quando efetivamente registrada.",
    },
    overrideAccess: true,
  });
  return created.id;
}

async function findOrCreateTag(payload: PayloadClient, name: string) {
  const slug = slugify(name).slice(0, 80);
  const found = await payload.find({
    collection: "tags",
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (found.docs.length) return found.docs[0].id;
  const created = await payload.create({
    collection: "tags",
    data: { name: name.trim().slice(0, 120), slug },
    overrideAccess: true,
  });
  return created.id;
}

async function findOrCreateSource(payload: PayloadClient, source: CheckedExternalSource) {
  const found = await payload.find({
    collection: "sources",
    where: { url: { equals: source.href } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const data = {
    name: (source.text || source.authorityKey).slice(0, 180),
    url: source.href,
    finalUrl: source.finalUrl,
    sourceType: source.official ? "official" : "recognized_media",
    reliability: source.official ? 0.95 : 0.75,
    httpStatus: source.status ?? undefined,
    retrievedAt: new Date().toISOString(),
    publisher: source.authorityKey,
  };
  if (found.docs.length) {
    const updated = await payload.update({
      collection: "sources",
      id: found.docs[0].id,
      data,
      overrideAccess: true,
    });
    return updated.id;
  }
  const created = await payload.create({ collection: "sources", data, overrideAccess: true });
  return created.id;
}

function validPauta(p: Partial<BacklogItem> | null, existing: Set<string>): p is BacklogItem {
  return Boolean(
    p && p.slug && /^[a-z0-9-]{8,90}$/.test(p.slug) && !existing.has(p.slug) &&
    p.title && p.primaryKeyword && p.angle && Array.isArray(p.mustCover) && p.mustCover.length >= 3 &&
    p.category && /^[a-z0-9-]{3,80}$/.test(p.category),
  );
}

function stripInvalidExternalLinks(html: string, invalid: CheckedExternalSource[]): string {
  const broken = new Set(invalid.map((link) => link.href.trim()));
  if (!broken.size) return html;
  return html.replace(
    /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (full, href: string, body: string) => (broken.has(href.trim()) ? body : full),
  );
}

// Registra o custo de cada chamada de IA (por post e etapa) em generation_log.
// Falha de log nunca quebra a geração.
type AiUsage = { provider: string; model: string; usage: { inputTokens: number; outputTokens: number } | null };

function logAi(slug: string, title: string, stage: string, r: AiUsage): void {
  const input = r.usage?.inputTokens ?? 0;
  const output = r.usage?.outputTokens ?? 0;
  void logGeneration({
    slug, title, kind: "text", stage,
    provider: r.provider, model: r.model,
    inputTokens: input, outputTokens: output,
    costUsd: estimateCostUsd(r.model, input, output),
  });
}

class PipelineStageError extends Error {
  constructor(
    message: string,
    public readonly stage: string,
    public readonly retryable = true,
  ) {
    super(message);
    this.name = "PipelineStageError";
  }
}

function hasWebResearchCapability(provider: string, model: string, collectedSources = 0): boolean {
  if (process.env.AI_RESEARCH_HAS_WEB_ACCESS === "1") return true;
  if (collectedSources >= 2) return true;
  return model.toLowerCase().includes("search") && !provider.toLowerCase().includes("fallback");
}

async function requiredResearch(topic: string, keyword: string, today: string, slug = "(pesquisa)"): Promise<string> {
  let r: Awaited<ReturnType<typeof generateText>>;
  const sources = await fetchResearchSources(topic, keyword);
  if (sources.length < 2) {
    throw new PipelineStageError("Pesquisa indisponível: não foram encontradas fontes web suficientes", "research", true);
  }
  try {
    r = await generateText(researchPrompt(topic, keyword, today, sources), { model: RESEARCH_MODEL, maxTokens: 6_000 });
  } catch (error) {
    throw new PipelineStageError(`Pesquisa indisponível: ${(error as Error).message}`, "research", true);
  }
  logAi(slug, topic, "pesquisa", r);
  if (!hasWebResearchCapability(r.provider, r.model, sources.length)) {
    throw new PipelineStageError(
      `Modelo resolvido sem busca web comprovada (${r.provider}/${r.model})`,
      "research",
      false,
    );
  }
  // O modelo pode resumir as fontes sem repetir as URLs completas. Preserve
  // sempre a evidência coletada pelo servidor junto da síntese do modelo, para
  // que os gates e o redator trabalhem com links verificáveis.
  const collectedEvidence = sources
    .map((source, index) => `${index + 1}. ${source.title}\nURL: ${source.url}\nResumo coletado: ${source.snippet || "(sem resumo)"}`)
    .join("\n");
  const text = [
    (r.text || "").trim(),
    `FONTES COLETADAS E URLs VERIFICÁVEIS:\n${collectedEvidence}`,
  ].filter(Boolean).join("\n\n").slice(0, 12_000);
  const urls = text.match(/https?:\/\/[^\s)\]}>"']+/gi) || [];
  if (text.length < 400 || new Set(urls).size < 2) {
    throw new PipelineStageError("Pesquisa sem evidência suficiente ou URLs verificáveis", "research", true);
  }
  return text;
}

// ---------- Pipeline de criação (1 pauta → 1 post publicado) ----------

type RunResult =
  | {
      slug: string;
      score: number;
      slot: Slot;
      model?: string;
      runId?: string;
      outcome: SuccessfulRunOutcome;
    }
  | {
      slug: string;
      reason: string;
      slot: Slot;
      runId?: string;
      retryable?: boolean;
      outcome: UnsuccessfulRunOutcome;
    };

async function createFromPauta(
  payload: PayloadClient,
  item: BacklogItem,
  slot: Slot,
  dryRun: boolean,
  today: string,
  knownArticleSlugs: Set<string>,
  settings: AutomationSettings,
): Promise<RunResult> {
  let run: EditorialRunHandle | null = null;
  try {
    run = await startEditorialRun(payload, {
      articleSlug: item.slug,
      slot,
      request: item,
      modelRequested: GPT,
    });

    // 1) Pesquisa obrigatória: sem busca web comprovada, a redação não começa.
    const research = await requiredResearch(item.title, item.primaryKeyword, today, item.slug);
    await checkpointEditorialRun(payload, run, { stage: "research", artifact: { research } });

    // 2) Redação com contrato validado.
    const w = await generateJson<GenPost>(writePrompt(item, research), { model: GPT, maxTokens: 14_000 });
    logAi(item.slug, item.title, "escrita", w);
    let post = parseAgentOutput(generatedPostSchema, w.data, "Rascunho");
    await checkpointEditorialRun(payload, run, {
      stage: "draft",
      artifact: post,
      modelResolved: w.model,
      providerResolved: w.provider,
    });

    const runFactCheck = async (candidate: GenPost, stage: string) => {
      let response = await generateJson<ReviewDecision>(reviewPrompt(candidate, item, research), {
        model: GPT_CHECK,
        maxTokens: 6_000,
      });
      if (!response.data) {
        // Modelos de raciocínio às vezes envolvem o JSON em prosa: uma retentativa estrita.
        response = await generateJson<ReviewDecision>(
          reviewPrompt(candidate, item, research) +
            "\nIMPORTANTE: comece a resposta diretamente com { e termine com }. Nada além do JSON.",
          { model: GPT_CHECK, maxTokens: 6_000 },
        );
      }
      logAi(item.slug, item.title, stage, response);
      if (response.provider === w.provider && response.model === w.model) {
        throw new PipelineStageError(
          `Checador não independente do redator (${response.provider}/${response.model})`,
          "fact_check",
          false,
        );
      }
      return {
        decision: parseAgentOutput(reviewDecisionSchema, response.data, "Revisão factual"),
        response,
      };
    };

    // 3) Checagem factual independente; qualquer correção é obrigatoriamente rechecada.
    // Até 2 rodadas de correção: checadores rigorosos raramente convergem em 1.
    let factual = await runFactCheck(post, "revisão/fatos");
    for (let round = 0; round < 2 && !factual.decision.passes; round += 1) {
      if (!factual.decision.requiredFixes.length) {
        throw new PipelineStageError("Revisão factual reprovou sem fornecer correções", "fact_check", false);
      }
      const fixed = await generateJson<GenPost>(fixPrompt(post, factual.decision.requiredFixes, item), {
        model: GPT,
        maxTokens: 14_000,
      });
      logAi(item.slug, item.title, `correção factual r${round + 1}`, fixed);
      post = parseAgentOutput(generatedPostSchema, fixed.data, "Correção factual");
      factual = await runFactCheck(post, `rechecagem/fatos r${round + 1}`);
    }
    const factualGate = gateDecision(
      "factual",
      post,
      factual.decision.passes,
      factual.decision.passes ? [] : factual.decision.requiredFixes,
      factual.decision.passes ? null : "draft",
    );
    await checkpointEditorialRun(payload, run, { stage: "fact_checked", artifact: factual.decision, gate: factualGate });
    if (!factualGate.pass) {
      await finishEditorialRun(payload, run, {
        status: "quarantined",
        stage: "fact_check",
        artifact: post,
        error: factualGate.blockingFindings.join("; "),
      });
      return {
        slug: item.slug,
        reason: `rechecagem factual: ${factualGate.blockingFindings.join(", ")}`,
        slot,
        runId: run.runId,
        outcome: "quarantined",
      };
    }

    // 4) Lapidação automatizada; a versão alterada volta ao checador factual.
    let humanizedBy = "não aplicada";
    try {
      const h = await generateJson<GenPost>(humanizePrompt(post, item), { model: HUMANIZER, maxTokens: 14_000 });
      logAi(item.slug, item.title, "lapidação", h);
      const polished = parseAgentOutput(generatedPostSchema, h.data, "Lapidação");
      if (keepsStructure(post.contentHtml, polished.contentHtml)) {
        const beforePolish = post;
        post = polished;
        humanizedBy = h.model;
        const postEditCheck = await runFactCheck(post, "rechecagem pós-edição");
        if (!postEditCheck.decision.passes) {
          // A lapidação fragilizou fatos → reverte para a versão pré-lapidação,
          // que JÁ passou no fact-check. Estilo nunca derruba uma run factualmente boa.
          post = beforePolish;
          humanizedBy = "revertida (fragilizou fatos)";
        }
      }
    } catch (error) {
      if (error instanceof PipelineStageError) throw error;
      // Falha estilística não bloqueia; conserva-se a versão factual aprovada.
    }

    // 5) Auditoria SEO; uma correção precisa ser reavaliada pelo próprio auditor.
    const runSeoAudit = async (candidate: GenPost, stage: string) => {
      const response = await generateJson<ReviewDecision>(seoPrompt(candidate, item), {
        model: GPT_SEO,
        maxTokens: 2_500,
      });
      logAi(item.slug, item.title, stage, response);
      return parseAgentOutput(reviewDecisionSchema, response.data, "Auditoria SEO");
    };
    const preSeoHash = artifactHash(post);
    const preSeoPost = post;
    let seo = await runSeoAudit(post, "seo");
    // Até 2 rodadas de correção+rechecagem: auditores exigentes raramente convergem em 1.
    for (let round = 0; round < 2 && !seo.passes; round += 1) {
      if (!seo.requiredFixes.length) {
        throw new PipelineStageError("Auditoria SEO reprovou sem correções", "seo", false);
      }
      const STRUCTURE_WARNING =
        "\nATENÇÃO CRÍTICA: preserve TODOS os links internos e externos, TODAS as tabelas e TODOS os H3 do texto atual. " +
        "Sua resposta anterior removeu estrutura e foi rejeitada. Faça apenas as correções pedidas, sem encurtar o artigo.";
      let candidate: GenPost | null = null;
      for (let attempt = 0; attempt < 2 && !candidate; attempt += 1) {
        const fixed = await generateJson<GenPost>(
          fixPrompt(post, seo.requiredFixes, item) + (attempt > 0 ? STRUCTURE_WARNING : ""),
          { model: GPT, maxTokens: 14_000 },
        );
        logAi(item.slug, item.title, `correção seo r${round + 1}${attempt > 0 ? " (retry)" : ""}`, fixed);
        const parsed = parseAgentOutput(generatedPostSchema, fixed.data, "Correção SEO");
        if (keepsStructure(post.contentHtml, parsed.contentHtml)) candidate = parsed;
      }
      if (!candidate) {
        throw new PipelineStageError("Correção SEO removeu estrutura ou evidências (2 tentativas)", "seo", false);
      }
      post = candidate;
      seo = await runSeoAudit(post, `rechecagem seo r${round + 1}`);
    }
    let seoAdvisory = false;
    if (!seo.passes) {
      // Após as rodadas de correção, o auditor LLM de SEO passa a ser CONSULTIVO:
      // os achados ficam registrados no EditorialRun, mas quem decide a publicação
      // são os portões determinísticos (barra 92/85, link audit, fact-check duplo).
      // Um juiz LLM com veredito instável não veta sozinho artigo factualmente aprovado.
      seoAdvisory = true;
    }
    if (artifactHash(post) !== preSeoHash) {
      const postSeoFactCheck = await runFactCheck(post, "rechecagem factual pós-SEO");
      if (!postSeoFactCheck.decision.passes) {
        // Correção SEO fragilizou fatos → reverte para a versão factualmente aprovada
        // e segue: o gate determinístico (barra 92/85 + reparo cirúrgico + link audit)
        // decide a publicação. Estética nunca derruba uma run com fatos corretos.
        post = preSeoPost;
        seoAdvisory = true;
      } else {
        factual = postSeoFactCheck;
      }
    }
    const seoGate = gateDecision(
      "search_experience",
      post,
      seo.passes || seoAdvisory,
      seo.passes ? [] : seo.requiredFixes,
      seo.passes || seoAdvisory ? null : "draft",
    );
    await checkpointEditorialRun(payload, run, { stage: "search_audit", artifact: seo, gate: seoGate });
    if (!seoGate.pass) {
      await finishEditorialRun(payload, run, {
        status: "quarantined",
        stage: "search_audit",
        artifact: post,
        error: seoGate.blockingFindings.join("; "),
      });
      return {
        slug: item.slug,
        reason: `SEO: ${seoGate.blockingFindings.join(", ")}`,
        slot,
        runId: run.runId,
        outcome: "quarantined",
      };
    }

    // 6) URLs reais alimentam o gate determinístico. Um único reparo é permitido.
    let linkAudit = await auditArticleLinks({ html: post.contentHtml, knownArticleSlugs, ymyl: item.ymyl });
    if (linkAudit.invalidExternal.length) {
      const cleanedHtml = stripInvalidExternalLinks(post.contentHtml, linkAudit.invalidExternal);
      if (cleanedHtml !== post.contentHtml) {
        post = { ...post, contentHtml: cleanedHtml };
        linkAudit = await auditArticleLinks({ html: post.contentHtml, knownArticleSlugs, ymyl: item.ymyl });
      }
    }
    const gateFor = (candidate: GenPost, issues: string[]) => scoreArticle({
      slug: item.slug,
      headline: item.title,
      description: candidate.summary,
      category: item.category,
      author: item.author,
      publishedAt: `${today}T00:00:00.000Z`,
      readingTime: candidate.readingTime,
      image: `/api/media/articles/${item.slug}.webp`,
      imageAlt: `Ilustração editorial sobre ${item.title}`,
      tags: candidate.tags,
      content: [],
      contentHtml: candidate.contentHtml,
      seoTitle: candidate.seoTitle,
      metaDescription: candidate.metaDescription,
      summary: candidate.summary,
      updatedAt: today,
    }, {
      validInternalSlugs: knownArticleSlugs,
      strictInternalLinks: true,
      officialSourceUrls: linkAudit.officialSourceUrls,
      criticalIssues: issues,
      contentHash: artifactHash(candidate.contentHtml),
      requireHumanReviewForSensitive: false,
    });
    let gate = gateFor(post, linkAudit.criticalIssues);
    if (!gate.passes) {
      const repairIssues = [...new Set([
        ...gate.missing,
        ...gate.hardBlockers.map((issue) => `${issue.label}: ${issue.detail}`),
        ...linkAudit.criticalIssues,
      ])];
      const repaired = await generateJson<GenPost>(repairPrompt(post, repairIssues, item, research), {
        model: GPT,
        maxTokens: 14_000,
      });
      logAi(item.slug, item.title, "reparo", repaired);
      let candidate = parseAgentOutput(generatedPostSchema, repaired.data, "Reparo do gate");
      let candidateAudit = await auditArticleLinks({ html: candidate.contentHtml, knownArticleSlugs, ymyl: item.ymyl });
      if (candidateAudit.invalidExternal.length) {
        const cleanedHtml = stripInvalidExternalLinks(candidate.contentHtml, candidateAudit.invalidExternal);
        if (cleanedHtml !== candidate.contentHtml) {
          candidate = { ...candidate, contentHtml: cleanedHtml };
          candidateAudit = await auditArticleLinks({ html: candidate.contentHtml, knownArticleSlugs, ymyl: item.ymyl });
        }
      }
      const [repairedFactCheck, repairedSeo] = await Promise.all([
        runFactCheck(candidate, "rechecagem factual pós-reparo"),
        runSeoAudit(candidate, "rechecagem SEO pós-reparo"),
      ]);
      const regate = gateFor(candidate, candidateAudit.criticalIssues);
      if (
        repairedFactCheck.decision.passes &&
        repairedSeo.passes &&
        (regate.score > gate.score || (regate.passes && !gate.passes))
      ) {
        post = candidate;
        gate = regate;
        linkAudit = candidateAudit;
        factual = repairedFactCheck;
        seo = repairedSeo;
      }
    }
    const blockerMessages = gate.hardBlockers.map((issue) => `${issue.label}: ${issue.detail}`);
    const warningMessages = gate.warnings.map((issue) => `${issue.label}: ${issue.detail}`);
    const technicalGate = gateDecision(
      "technical",
      post,
      gate.passes,
      blockerMessages,
      gate.passes ? null : "research",
      warningMessages,
    );
    await checkpointEditorialRun(payload, run, { stage: "technical_gate", artifact: gate, gate: technicalGate });
    if (!technicalGate.pass || !meetsPublishBar(gate.score, item.ymyl)) {
      await finishEditorialRun(payload, run, {
        status: "quarantined",
        stage: "technical_gate",
        artifact: post,
        error: [...blockerMessages, ...gate.missing].join("; "),
      });
      return {
        slug: item.slug,
        reason: `portão ${gate.score}: ${[...blockerMessages, ...gate.missing].join(", ")}`,
        slot,
        runId: run.runId,
        outcome: "quarantined",
      };
    }

    if (dryRun) {
      await finishEditorialRun(payload, run, { status: "approved", stage: "dry_run", artifact: post });
      return { slug: item.slug, score: gate.score, slot, model: humanizedBy, runId: run.runId, outcome: "dry_run" };
    }

    // 7) Mídia é obrigatória e seus créditos são persistidos.
    const stock = await fetchStockImage(imageQueryFor(item));
    if (!stock) throw new PipelineStageError("Nenhuma imagem licenciável e relevante foi encontrada", "image", true);
    const webp = await sharp(stock.buffer)
      .resize(1600, 900, { fit: "cover", position: "attention" })
      .webp({ quality: 72 })
      .toBuffer();
    await r2Put(`articles/${item.slug}.webp`, webp, "image/webp");
    void logGeneration({
      slug: item.slug,
      title: item.title,
      kind: "image",
      stage: "imagem",
      provider: stock.provider,
      model: "stock-image",
      costUsd: 0,
    });

    // 8) Persiste todos os artefatos validados. YMYL vira draft para revisão humana.
    const uniqueTags = [...new Set(post.tags.map((tag) => tag.trim()).filter(Boolean))];
    const validSources = [...new Map(
      linkAudit.external
        .filter((source) => source.valid)
        .map((source) => [source.finalUrl || source.href, source] as const),
    ).values()];
    const [categoryId, authorId, tagIds, sourceIds] = await Promise.all([
      findOrCreateCategory(payload, item.category),
      findOrCreateAuthor(payload, item.author),
      Promise.all(uniqueTags.map((tag) => findOrCreateTag(payload, tag))),
      Promise.all(validSources.map((source) => findOrCreateSource(payload, source))),
    ]);
    const reviewRequired = item.ymyl || settings.requireHumanReviewAll;
    const now = new Date();
    const nextReview = new Date(now.getTime() + (item.ymyl ? 90 : slot === "news" ? 30 : 180) * 86_400_000);
    const contentType = slot === "news" ? "news" : item.type === "serviço" ? "service" : /guia/i.test(item.type) ? "guide" : "article";
    await payload.create({
      collection: "articles",
      data: {
        headline: item.title,
        seoTitle: post.seoTitle,
        socialTitle: post.seoTitle,
        description: post.summary,
        slug: item.slug,
        primaryKeyword: item.primaryKeyword,
        primaryCategory: categoryId,
        tags: tagIds,
        summary: post.summary,
        readingTime: post.readingTime,
        content: minimalLexical(post.summary),
        contentHtml: post.contentHtml,
        imagePath: `/api/media/articles/${item.slug}.webp`,
        imageAlt: `Ilustração editorial sobre ${item.title}`,
        imageCaption: `Imagem de apoio sobre ${item.title}`,
        imageCredit: stock.credit,
        imageProvider: stock.provider,
        imageLicense: stock.license,
        imageSourceUrl: stock.sourceUrl,
        sources: sourceIds,
        author: authorId,
        ...(reviewRequired ? {} : { publishedAt: now.toISOString(), editorialUpdatedAt: now.toISOString() }),
        nextReviewAt: nextReview.toISOString(),
        contentType,
        editorialRunId: run.runId,
        primaryIntent: item.angle,
        secondaryIntents: item.mustCover,
        updateTriggers: ["mudança em fonte oficial", "queda de desempenho", "revisão programada"],
        riskLevel: reviewRequired ? "high" : "low",
        status: reviewRequired ? "human_review" : "published",
        scores: { editorial: gate.score, checks: gate.checks },
        qualityReport: { gate, linkAudit, factual: factual.decision, seo },
        meta: { title: post.seoTitle, description: post.metaDescription },
        _status: reviewRequired ? "draft" : "published",
      },
      overrideAccess: true,
    });
    await finishEditorialRun(payload, run, {
      status: reviewRequired ? "human_review_required" : "published",
      stage: reviewRequired ? "human_review" : "published",
      artifact: post,
    });
    return {
      slug: item.slug,
      score: gate.score,
      slot,
      model: humanizedBy,
      runId: run.runId,
      outcome: reviewRequired ? "human_review_required" : "published",
    };
  } catch (error) {
    const retryable = error instanceof PipelineStageError ? error.retryable : true;
    if (run) {
      await finishEditorialRun(payload, run, {
        status: retryable ? "failed" : "quarantined",
        stage: error instanceof PipelineStageError ? error.stage : "unknown",
        error: (error as Error).message.slice(0, 2_000),
      }).catch(() => undefined);
    }
    if (retryable) throw error;
    return {
      slug: item.slug,
      reason: (error as Error).message,
      slot,
      runId: run?.runId,
      retryable,
      outcome: "quarantined",
    };
  }
}

// ---------- Slots ----------

const seedSlugs = new Set(seedArticles.map((a) => a.slug));

function interlinkCandidates(existing: Array<{ slug: string; headline: string }>): string {
  return existing.slice(0, 12).map((a) => `/artigos/${a.slug} ("${a.headline}")`).join("; ");
}

function normalizePauta(p: BacklogItem): BacklogItem {
  return {
    ...p,
    slug: slugify(p.slug),
    author: AUTHOR_BY_CATEGORY[p.category] || "Mesa de Economia",
    words: p.words || "1200 a 1600",
    ymyl: Boolean(p.ymyl) || (YMYL_CATEGORIES as readonly string[]).includes(p.category),
    interlinks: Array.isArray(p.interlinks) ? p.interlinks.filter((l) => l && l.slug && l.anchor).slice(0, 3) : [],
    mustCover: p.mustCover.slice(0, 8),
  };
}

/** Aplica as regras do editor (/admin) a uma pauta candidata. Retorna erro descritivo ou null. */
function pautaPolicyError(item: BacklogItem, settings: AutomationSettings): string | null {
  if (!settings.categoriesEnabled.includes(item.category)) {
    return `editoria "${item.category}" desabilitada nas configurações`;
  }
  const blocked = matchesBlockedTopic(
    `${item.title} ${item.primaryKeyword} ${item.angle}`,
    settings.blockedTopics,
  );
  if (blocked) return `tema bloqueado nas configurações ("${blocked}")`;
  return null;
}

async function pautaForSlot(slot: Slot, existing: Set<string>, articles: Array<{ slug: string; headline: string }>, today: string, settings: AutomationSettings): Promise<BacklogItem | { error: string }> {
  const candidates = interlinkCandidates(articles);
  const existingList = [...existing].slice(-60);

  if (slot === "news") {
    const trends = await fetchTrendingBR();
    if (!trends.length) return { error: "sem fontes de trending disponíveis" };
    // Até 2 tentativas: modelos de fallback às vezes devolvem raciocínio em vez de JSON puro.
    let lastRaw = "";
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const plan = await generateJson<BacklogItem>(
        planNewsPrompt(trends.map((t) => `[${t.source}] ${t.title}`), existingList, candidates, today, settings) +
          (attempt > 0 ? "\nIMPORTANTE: comece a resposta diretamente com { e termine com }. Nada além do JSON." : ""),
        { model: PLANNER, maxTokens: 2_000 });
      logAi(plan.data?.slug || "(pauta)", plan.data?.title || "Pauta de notícia (Trends)", "pauta", plan);
      const draft = Array.isArray(plan.data) && plan.data.length === 1 ? plan.data[0] : plan.data;
      if (validPauta(draft, existing)) {
        const normalized = normalizePauta({ ...draft, type: draft.type || "explicador de notícia" });
        const policyError = pautaPolicyError(normalized, settings);
        if (!policyError) return normalized;
        lastRaw = policyError;
        continue;
      }
      lastRaw = plan.raw || `resposta vazia (${plan.provider}/${plan.model})`;
    }
    const fallback = AUTOMATION_FALLBACKS.find((item) => item.category === "brasil" && !existing.has(item.slug) && !pautaPolicyError(item, settings));
    if (fallback) return fallback;
    return { error: `pauta de notícia inválida: ${lastRaw.slice(0, 120)}` };
  }

  // evergreen/service: fila curada primeiro; acabou → GPT gera pauta nova nos pilares
  const wantService = slot === "service";
  const fromBacklog = editorialBacklog.find((b) =>
    !existing.has(b.slug) &&
    (wantService ? b.type === "serviço" : b.type !== "serviço") &&
    !pautaPolicyError(b, settings));
  if (fromBacklog) return fromBacklog;

  let lastRaw = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const plan = await generateJson<BacklogItem>(
      planEvergreenPrompt(wantService ? "service" : "evergreen", existingList, candidates, today, settings) +
        (attempt > 0 ? "\nIMPORTANTE: comece a resposta diretamente com { e termine com }. Nada além do JSON." : ""),
      { model: PLANNER, maxTokens: 2_000 });
    logAi(plan.data?.slug || "(pauta)", plan.data?.title || "Pauta evergreen/serviço", "pauta", plan);
    const draft = Array.isArray(plan.data) && plan.data.length === 1 ? plan.data[0] : plan.data;
    if (validPauta(draft, existing)) {
      const normalized = normalizePauta(draft);
      const policyError = pautaPolicyError(normalized, settings);
      if (!policyError) return normalized;
      lastRaw = policyError;
      continue;
    }
    lastRaw = plan.raw || `resposta vazia (${plan.provider}/${plan.model})`;
  }
  const fallback = AUTOMATION_FALLBACKS.find((item) =>
    !existing.has(item.slug) &&
    (wantService ? item.type === "serviço" : item.type !== "serviço") &&
    !pautaPolicyError(item, settings),
  );
  if (fallback) return fallback;
  return { error: `pauta gerada inválida: ${lastRaw.slice(0, 120)}` };
}

// Atualização de post antigo: pega o artigo do banco (não-seed) mais defasado.
async function runUpdateSlot(
  payload: PayloadClient,
  dryRun: boolean,
  today: string,
  knownArticleSlugs: Set<string>,
  settings: AutomationSettings,
): Promise<RunResult | null> {
  const res = await payload.find({
    collection: "articles",
    where: { _status: { equals: "published" } },
    sort: "updatedAt",
    limit: 30,
    depth: 1,
    overrideAccess: true,
  });
  const cutoff = Date.now() - 20 * 24 * 60 * 60 * 1000;
  const doc = (res.docs as Array<{
    id: string | number; slug: string; headline: string; contentHtml?: string | null;
    updatedAt?: string; primaryKeyword?: string | null;
    primaryCategory?: { slug?: string } | null; author?: { name?: string } | null;
    publishedAt?: string | null; readingTime?: string | null;
    imagePath?: string | null; imageAlt?: string | null;
    riskLevel?: "low" | "medium" | "high" | null;
  }>).find((d) => d.contentHtml && !seedSlugs.has(d.slug) && new Date(d.updatedAt || 0).getTime() < cutoff);
  if (!doc) return null; // nada defasado → quem chamou cai para evergreen

  const category = doc.primaryCategory?.slug || "brasil";
  const ymyl = doc.riskLevel === "high" || (YMYL_CATEGORIES as readonly string[]).includes(category);
  const author = doc.author?.name || AUTHOR_BY_CATEGORY[category] || "Mesa de Economia";

  let run: EditorialRunHandle | null = null;
  try {
    run = await startEditorialRun(payload, {
      articleSlug: doc.slug,
      slot: "update",
      request: {
        kind: "update",
        articleId: doc.id,
        slug: doc.slug,
        sourceUpdatedAt: doc.updatedAt,
        sourceContentHash: artifactHash(doc.contentHtml!),
      },
      modelRequested: GPT,
    });
    const item = parseAgentOutput(backlogItemSchema, {
      slug: doc.slug,
      title: doc.headline,
      category,
      author,
      type: "atualização editorial",
      primaryKeyword: doc.primaryKeyword || doc.headline,
      words: "preservar profundidade atual",
      ymyl,
      angle: "Reapurar o conteúdo publicado e atualizar somente afirmações sustentadas por evidências atuais.",
      mustCover: [
        "preservar fatos que continuam corretos",
        "corrigir dados que mudaram desde a publicação",
        "citar fontes específicas para toda mudança material",
      ],
      interlinks: [],
    }, "Contexto da atualização");

    const quarantine = async (stage: string, reason: string, artifact?: unknown): Promise<RunResult> => {
      await finishEditorialRun(payload, run!, {
        status: "quarantined",
        stage,
        artifact,
        error: reason.slice(0, 2_000),
      });
      return {
        slug: doc.slug,
        reason,
        slot: "update",
        runId: run!.runId,
        retryable: false,
        outcome: "quarantined",
      };
    };

    // 1) Atualização nunca opera sem pesquisa web verificável.
    const research = await requiredResearch(doc.headline, item.primaryKeyword, today, doc.slug);
    await checkpointEditorialRun(payload, run, { stage: "research", artifact: { research } });

    // 2) Produz uma versão candidata, sem tocar a versão publicada.
    const updateResponse = await generateJson<GenPost>(
      updatePrompt(doc.headline, doc.contentHtml!, research, today),
      { model: GPT, maxTokens: 14_000 },
    );
    logAi(doc.slug, doc.headline, "atualização", updateResponse);
    let post = parseAgentOutput(generatedPostSchema, updateResponse.data, "Atualização");
    let writerIdentity = { provider: updateResponse.provider, model: updateResponse.model };
    await checkpointEditorialRun(payload, run, {
      stage: "draft",
      artifact: post,
      modelResolved: updateResponse.model,
      providerResolved: updateResponse.provider,
    });

    const runFactCheck = async (candidate: GenPost, stage: string) => {
      let response = await generateJson<ReviewDecision>(reviewPrompt(candidate, item, research), {
        model: GPT_CHECK,
        maxTokens: 6_000,
      });
      if (!response.data) {
        response = await generateJson<ReviewDecision>(
          reviewPrompt(candidate, item, research) +
            "\nIMPORTANTE: comece a resposta diretamente com { e termine com }. Nada além do JSON.",
          { model: GPT_CHECK, maxTokens: 6_000 },
        );
      }
      logAi(doc.slug, doc.headline, stage, response);
      if (response.provider === writerIdentity.provider && response.model === writerIdentity.model) {
        throw new PipelineStageError(
          `Checador não independente do redator (${response.provider}/${response.model})`,
          "fact_check",
          false,
        );
      }
      return {
        decision: parseAgentOutput(reviewDecisionSchema, response.data, "Revisão factual da atualização"),
        response,
      };
    };
    const factualPasses = (decision: ReviewDecision) =>
      decision.passes && meetsPublishBar(decision.score, ymyl);
    const factualFindings = (decision: ReviewDecision) => decision.requiredFixes.length
      ? decision.requiredFixes
      : [`Score factual ${decision.score} abaixo da barra ou decisão sem aprovação`];

    // 3) Checagem independente e rechecagem obrigatória após correção.
    let factual = await runFactCheck(post, "checagem factual da atualização");
    if (!factualPasses(factual.decision)) {
      if (!factual.decision.requiredFixes.length) {
        return quarantine("fact_check", factualFindings(factual.decision).join("; "), post);
      }
      const fixed = await generateJson<GenPost>(fixPrompt(post, factual.decision.requiredFixes, item), {
        model: GPT,
        maxTokens: 14_000,
      });
      logAi(doc.slug, doc.headline, "correção factual da atualização", fixed);
      post = parseAgentOutput(generatedPostSchema, fixed.data, "Correção factual da atualização");
      writerIdentity = { provider: fixed.provider, model: fixed.model };
      factual = await runFactCheck(post, "rechecagem factual da atualização");
    }
    const factualGate = gateDecision(
      "update_factual",
      post,
      factualPasses(factual.decision),
      factualPasses(factual.decision) ? [] : factualFindings(factual.decision),
      factualPasses(factual.decision) ? null : "draft",
    );
    await checkpointEditorialRun(payload, run, {
      stage: "fact_checked",
      artifact: factual.decision,
      gate: factualGate,
    });
    if (!factualGate.pass) {
      return quarantine("fact_check", factualGate.blockingFindings.join("; "), post);
    }

    // 4) Auditoria de busca. Se ela editar o texto, fatos e SEO são rechecados.
    const runSeoAudit = async (candidate: GenPost, stage: string) => {
      const response = await generateJson<ReviewDecision>(seoPrompt(candidate, item), {
        model: GPT_SEO,
        maxTokens: 2_500,
      });
      logAi(doc.slug, doc.headline, stage, response);
      return parseAgentOutput(reviewDecisionSchema, response.data, "Auditoria SEO da atualização");
    };
    const seoPasses = (decision: ReviewDecision) => decision.passes && decision.score >= 90;
    const seoFindings = (decision: ReviewDecision) => decision.requiredFixes.length
      ? decision.requiredFixes
      : [`Score SEO ${decision.score} abaixo de 90 ou decisão sem aprovação`];

    let seo = await runSeoAudit(post, "auditoria SEO da atualização");
    if (!seoPasses(seo)) {
      if (!seo.requiredFixes.length) {
        return quarantine("search_audit", seoFindings(seo).join("; "), post);
      }
      const fixed = await generateJson<GenPost>(fixPrompt(post, seo.requiredFixes, item), {
        model: GPT,
        maxTokens: 14_000,
      });
      logAi(doc.slug, doc.headline, "correção SEO da atualização", fixed);
      const candidate = parseAgentOutput(generatedPostSchema, fixed.data, "Correção SEO da atualização");
      if (!keepsStructure(post.contentHtml, candidate.contentHtml)) {
        return quarantine("search_audit", "Correção SEO removeu estrutura ou evidências", candidate);
      }
      post = candidate;
      writerIdentity = { provider: fixed.provider, model: fixed.model };
      const [seoRecheck, factualRecheck] = await Promise.all([
        runSeoAudit(post, "rechecagem SEO da atualização"),
        runFactCheck(post, "rechecagem factual pós-SEO"),
      ]);
      seo = seoRecheck;
      factual = factualRecheck;
      const postSeoFactualGate = gateDecision(
        "update_factual_after_seo",
        post,
        factualPasses(factual.decision),
        factualPasses(factual.decision) ? [] : factualFindings(factual.decision),
        factualPasses(factual.decision) ? null : "draft",
      );
      await checkpointEditorialRun(payload, run, {
        stage: "fact_checked",
        artifact: factual.decision,
        gate: postSeoFactualGate,
      });
      if (!postSeoFactualGate.pass) {
        return quarantine("fact_check", postSeoFactualGate.blockingFindings.join("; "), post);
      }
    }
    const seoGate = gateDecision(
      "update_search_experience",
      post,
      seoPasses(seo),
      seoPasses(seo) ? [] : seoFindings(seo),
      seoPasses(seo) ? null : "draft",
    );
    await checkpointEditorialRun(payload, run, { stage: "search_audit", artifact: seo, gate: seoGate });
    if (!seoGate.pass) {
      return quarantine("search_audit", seoGate.blockingFindings.join("; "), post);
    }

    // 5) Links e fontes são resolvidos antes do score determinístico.
    let linkAudit = await auditArticleLinks({ html: post.contentHtml, knownArticleSlugs, ymyl });
    const gateFor = (candidate: GenPost, issues: string[], officialSourceUrls: string[]) => scoreArticle({
      slug: doc.slug,
      headline: candidate.headline,
      description: candidate.summary,
      category,
      author,
      publishedAt: doc.publishedAt || `${today}T00:00:00.000Z`,
      readingTime: candidate.readingTime,
      image: doc.imagePath || `/api/media/articles/${doc.slug}.webp`,
      imageAlt: doc.imageAlt || `Ilustração editorial sobre ${doc.headline}`,
      tags: candidate.tags,
      content: [],
      contentHtml: candidate.contentHtml,
      seoTitle: candidate.seoTitle,
      metaDescription: candidate.metaDescription,
      summary: candidate.summary,
      updatedAt: today,
    }, {
      validInternalSlugs: knownArticleSlugs,
      strictInternalLinks: true,
      officialSourceUrls,
      criticalIssues: issues,
      contentHash: artifactHash(candidate.contentHtml),
      // A aprovação humana é aplicada depois do gate técnico, sobre o hash final.
      requireHumanReviewForSensitive: false,
    });
    let gate = gateFor(post, linkAudit.criticalIssues, linkAudit.officialSourceUrls);

    // Um reparo técnico é permitido, mas a nova versão volta por todos os auditores.
    if (!gate.passes || !meetsPublishBar(gate.score, ymyl)) {
      const repairIssues = [...new Set([
        ...gate.missing,
        ...gate.hardBlockers.map((issue) => `${issue.label}: ${issue.detail}`),
        ...linkAudit.criticalIssues,
      ])];
      const repaired = await generateJson<GenPost>(repairPrompt(post, repairIssues, item, research), {
        model: GPT,
        maxTokens: 14_000,
      });
      logAi(doc.slug, doc.headline, "reparo técnico da atualização", repaired);
      const candidate = parseAgentOutput(generatedPostSchema, repaired.data, "Reparo técnico da atualização");
      if (!keepsStructure(post.contentHtml, candidate.contentHtml)) {
        return quarantine("technical_gate", "Reparo técnico removeu estrutura ou evidências", candidate);
      }
      writerIdentity = { provider: repaired.provider, model: repaired.model };
      const [repairedFactual, repairedSeo, repairedLinks] = await Promise.all([
        runFactCheck(candidate, "rechecagem factual pós-reparo técnico"),
        runSeoAudit(candidate, "rechecagem SEO pós-reparo técnico"),
        auditArticleLinks({ html: candidate.contentHtml, knownArticleSlugs, ymyl }),
      ]);
      post = candidate;
      factual = repairedFactual;
      seo = repairedSeo;
      linkAudit = repairedLinks;
      gate = gateFor(post, linkAudit.criticalIssues, linkAudit.officialSourceUrls);

      const repairedFactualPass = factualPasses(factual.decision);
      const repairedSeoPass = seoPasses(seo);
      await checkpointEditorialRun(payload, run, {
        stage: "fact_checked",
        artifact: factual.decision,
        gate: gateDecision(
          "update_factual_after_technical_repair",
          post,
          repairedFactualPass,
          repairedFactualPass ? [] : factualFindings(factual.decision),
          repairedFactualPass ? null : "draft",
        ),
      });
      await checkpointEditorialRun(payload, run, {
        stage: "search_audit",
        artifact: seo,
        gate: gateDecision(
          "update_search_after_technical_repair",
          post,
          repairedSeoPass,
          repairedSeoPass ? [] : seoFindings(seo),
          repairedSeoPass ? null : "draft",
        ),
      });
      if (!repairedFactualPass) {
        return quarantine("fact_check", factualFindings(factual.decision).join("; "), post);
      }
      if (!repairedSeoPass) {
        return quarantine("search_audit", seoFindings(seo).join("; "), post);
      }
    }

    const blockerMessages = gate.hardBlockers.map((issue) => `${issue.label}: ${issue.detail}`);
    const technicalPass = updateCanAdvance({
      factualPasses: factualPasses(factual.decision),
      seoPasses: seoPasses(seo),
      scoreGatePasses: gate.passes,
      meetsRiskBar: meetsPublishBar(gate.score, ymyl),
    });
    const technicalGate = gateDecision(
      "update_technical",
      post,
      technicalPass,
      technicalPass ? [] : [...new Set([...blockerMessages, ...gate.missing])],
      technicalPass ? null : "research",
      gate.warnings.map((warning) => `${warning.label}: ${warning.detail}`),
    );
    await checkpointEditorialRun(payload, run, {
      stage: "technical_gate",
      artifact: { gate, linkAudit },
      gate: technicalGate,
    });
    if (!technicalGate.pass) {
      return quarantine(
        "technical_gate",
        `Atualização reprovada no portão ${gate.score}: ${technicalGate.blockingFindings.join(", ")}`,
        post,
      );
    }

    if (dryRun) {
      await finishEditorialRun(payload, run, { status: "approved", stage: "dry_run", artifact: post });
      return { slug: doc.slug, score: gate.score, slot: "update", runId: run.runId, outcome: "dry_run" };
    }

    const [tagIds, sourceIds] = await Promise.all([
      Promise.all(post.tags.map((tag) => findOrCreateTag(payload, tag))),
      Promise.all(linkAudit.external.filter((source) => source.valid).map((source) => findOrCreateSource(payload, source))),
    ]);
    const now = new Date();
    const nextReview = new Date(now.getTime() + (ymyl ? 90 : 180) * 86_400_000);
    const reviewRequired = ymyl || settings.requireHumanReviewAll;
    await payload.update({
      collection: "articles",
      id: doc.id,
      draft: reviewRequired,
      data: {
        headline: post.headline,
        seoTitle: post.seoTitle,
        socialTitle: post.seoTitle,
        description: post.summary,
        summary: post.summary,
        readingTime: post.readingTime,
        content: minimalLexical(post.summary),
        contentHtml: post.contentHtml,
        tags: tagIds,
        sources: sourceIds,
        editorialRunId: run.runId,
        editorialUpdatedAt: now.toISOString(),
        nextReviewAt: nextReview.toISOString(),
        riskLevel: reviewRequired ? "high" : doc.riskLevel || "low",
        status: reviewRequired ? "human_review" : "published",
        scores: { editorial: gate.score, checks: gate.checks },
        qualityReport: { gate, linkAudit, factual: factual.decision, seo, updateResearchHash: artifactHash(research) },
        meta: { title: post.seoTitle, description: post.metaDescription },
        reviewer: null,
        reviewedAt: null,
        reviewedContentHash: null,
        _status: reviewRequired ? "draft" : "published",
      },
      overrideAccess: true,
    });
    await finishEditorialRun(payload, run, {
      status: reviewRequired ? "human_review_required" : "published",
      stage: reviewRequired ? "human_review" : "published",
      artifact: post,
    });
    return {
      slug: doc.slug,
      score: gate.score,
      slot: "update",
      runId: run.runId,
      outcome: reviewRequired ? "human_review_required" : "updated",
    };
  } catch (error) {
    const retryable = error instanceof PipelineStageError ? error.retryable : true;
    if (run) {
      await finishEditorialRun(payload, run, {
        status: retryable ? "failed" : "quarantined",
        stage: error instanceof PipelineStageError ? error.stage : "update",
        error: (error as Error).message.slice(0, 2_000),
      }).catch(() => undefined);
    }
    if (retryable) throw error;
    return {
      slug: doc.slug,
      reason: (error as Error).message,
      slot: "update",
      runId: run?.runId,
      retryable,
      outcome: "quarantined",
    };
  }
}

// ---------- Handler ----------

type RunReport = {
  ok: boolean;
  error?: string;
  engine: string;
  humanizer: string;
  dryRun: boolean;
  slots: Slot[];
  published: RunResult[];
  pendingReview: RunResult[];
  dryRuns: RunResult[];
  skipped: RunResult[];
};

async function runSlots(slots: Slot[], dryRun: boolean): Promise<RunReport> {
  const payload = await getPayload({ config });
  const today = new Date().toISOString().slice(0, 10);
  const settings = await getAutomationSettings();

  const published: RunResult[] = [];
  const pendingReview: RunResult[] = [];
  const dryRuns: RunResult[] = [];
  const skipped: RunResult[] = [];
  const buckets = { published, pendingReview, dryRuns, skipped };
  const record = (result: RunResult) => buckets[runReportBucket(result.outcome)].push(result);

  for (const slot of slots) {
    try {
      // Guardas do editor (re-checadas a cada slot: orçamento e teto diário evoluem durante a run).
      if (!dryRun) {
        const budget = await getBudgetStatus(settings);
        if (budget.blocked) {
          record({ slug: `(${slot})`, reason: `orçamento: ${budget.reason}`, slot, retryable: false, outcome: "skipped" });
          continue;
        }
        const postsToday = await countArticlesCreatedToday();
        if (postsToday >= settings.maxPostsPerDay) {
          record({ slug: `(${slot})`, reason: `teto diário de ${settings.maxPostsPerDay} posts atingido`, slot, retryable: false, outcome: "skipped" });
          continue;
        }
      }

      const all = await getArticles(); // recarrega a cada slot (inclui o que acabou de publicar)
      const existing = new Set(all.map((a) => a.slug));

      if (slot === "update") {
        const updated = await runUpdateSlot(payload, dryRun, today, existing, settings);
        if (updated) {
          record(updated);
          continue;
        }
        // nada para atualizar ainda → publica um evergreen no lugar
      }

      const effective: Slot = slot === "update" ? "evergreen" : slot;
      const pauta = await pautaForSlot(effective, existing, all, today, settings);
      if ("error" in pauta) {
        record({ slug: `(${slot})`, reason: pauta.error, slot, outcome: "skipped" });
        continue;
      }
      const result = await createFromPauta(payload, pauta, slot, dryRun, today, existing, settings);
      record(result);
    } catch (e) {
      record({
        slug: `(${slot})`,
        reason: (e as Error).message.slice(0, 200),
        slot,
        retryable: true,
        outcome: "failed",
      });
    }
  }

  const retryableFailures = skipped.filter((result) => result.outcome === "failed" && result.retryable !== false);
  return {
    ok: retryableFailures.length === 0,
    ...(retryableFailures.length
      ? { error: `${retryableFailures.length} estágio(s) falharam e devem ser repetidos` }
      : {}),
    engine: GPT,
    humanizer: HUMANIZER,
    dryRun,
    slots,
    published,
    pendingReview,
    dryRuns,
    skipped,
  };
}

// Estado do último disparo assíncrono (instância única no Railway; sobrevive entre
// requests porque o servidor é persistente — não é serverless).
type AsyncState = { id: string; startedAt: string; finishedAt: string | null; running: boolean; report: RunReport | null; error: string | null };
const globalState = globalThis as unknown as { __dailyPublishRun?: AsyncState };

function authorized(request: Request): boolean {
  const token = request.headers.get("x-cron-token") || request.headers.get("x-admin-token");
  if (!token) return false;
  const acceptedTokens = [
    process.env.AUTOMATION_TOKEN,
    process.env.CRON_TOKEN,
    // Compatibilidade temporária: remova depois de migrar os chamadores antigos.
    process.env.IMAGE_GEN_TOKEN,
  ].filter((value): value is string => Boolean(value));
  return acceptedTokens.some((value) => token === value);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(request.url);
  const count = Math.min(5, Math.max(1, parseInt(url.searchParams.get("count") || "5", 10) || 5));
  const dryRun = url.searchParams.get("dry") === "1";
  const isAsync = url.searchParams.get("async") === "1";
  const slotParam = url.searchParams.get("slot") as Slot | null;
  if (!dryRun && !r2Configured()) {
    return NextResponse.json({ ok: false, error: "R2 not configured" }, { status: 400 });
  }

  // Guardas do editor (/admin → Configurações): chave geral, orçamento e teto diário.
  if (!dryRun) {
    const settings = await getAutomationSettings();
    if (!settings.enabled) {
      return NextResponse.json({ ok: false, error: "automação desativada nas configurações do /admin" }, { status: 409 });
    }
    const budget = await getBudgetStatus(settings);
    if (budget.blocked) {
      return NextResponse.json({ ok: false, error: `orçamento excedido: ${budget.reason}`, budget }, { status: 429 });
    }
    const postsToday = await countArticlesCreatedToday();
    if (postsToday >= settings.maxPostsPerDay) {
      return NextResponse.json(
        { ok: false, error: `teto diário de ${settings.maxPostsPerDay} posts atingido (${postsToday} criados hoje)` },
        { status: 429 },
      );
    }
  }

  // Grade anti-spam do dia: 1 notícia + 2 evergreen + 1 serviço + 1 atualização.
  const slots: Slot[] = slotParam && ["news", "evergreen", "service", "update"].includes(slotParam)
    ? Array<Slot>(count).fill(slotParam)
    : (["news", "evergreen", "evergreen", "service", "update"] as Slot[]).slice(0, count);

  if (!isAsync) {
    return NextResponse.json(await runSlots(slots, dryRun));
  }

  // Modo assíncrono (usado pelo cron via Cloudflare): responde já e processa em background.
  if (globalState.__dailyPublishRun?.running) {
    return NextResponse.json({ ok: false, error: "run already in progress", state: globalState.__dailyPublishRun }, { status: 409 });
  }
  const state: AsyncState = {
    id: Math.random().toString(36).slice(2, 10),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    running: true,
    report: null,
    error: null,
  };
  globalState.__dailyPublishRun = state;
  void runSlots(slots, dryRun)
    .then((report) => { state.report = report; })
    .catch((e) => { state.error = (e as Error).message.slice(0, 300); })
    .finally(() => { state.running = false; state.finishedAt = new Date().toISOString(); });
  return NextResponse.json({ ok: true, started: true, id: state.id, slots, dryRun }, { status: 202 });
}

// Status do disparo assíncrono (polling do cron).
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const state = globalState.__dailyPublishRun ?? { running: false, report: null };
  return NextResponse.json({ ...state, build: "v9-automation-settings", providers: providerHealth(), engine: GPT, humanizer: HUMANIZER }, {
    headers: { "cache-control": "no-store" },
  });
}
