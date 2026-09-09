import { articleBodies } from "./article-bodies";
import { clusterArticles } from "./cluster-articles";
import { clusterArticles2 } from "./cluster-articles-2";
import { clusterArticles3 } from "./cluster-articles-3";
import { clusterArticles4 } from "./cluster-articles-4";

export type Category = {
  slug: string;
  name: string;
  description: string;
  color: string;
};

export type ArticleReviewer = {
  id: string;
  name: string;
};

export type Article = {
  slug: string;
  headline: string;
  description: string;
  category: string;
  author: string;
  publishedAt: string;
  readingTime: string;
  image: string;
  /** Descriptive alt text for the hero image (SEO + a11y). Falls back to headline. */
  imageAlt?: string;
  /** Visible caption shown under the hero image. */
  imageCaption?: string;
  /** Image credit/source line (e.g. "Imagem: IA / Fato Nacional"). */
  imageCredit?: string;
  /** Original public path persisted by the CMS. */
  imagePath?: string;
  imageProvider?: string;
  imageLicense?: string;
  imageSourceUrl?: string;
  tags: string[];
  content: string[];
  /** Rich long-form body (semantic HTML incl. FAQ). Preferred over `content` when present. */
  contentHtml?: string;
  seoTitle?: string;
  metaDescription?: string;
  summary?: string;
  /** Date of a substantive editorial change, not a technical CMS write. */
  editorialUpdatedAt?: string;
  updatedAt?: string;
  contentType?: "news" | "article" | "guide" | "service";
  riskLevel?: "low" | "medium" | "high";
  reviewer?: ArticleReviewer;
  reviewedAt?: string;
  reviewedContentHash?: string;
  /** True only when the CMS review hash matches the exact body being displayed. */
  reviewedVersionMatches?: boolean;
};

export const categories: Category[] = [
  {
    slug: "brasil",
    name: "Brasil",
    description: "Serviços públicos, economia doméstica e cidadania.",
    color: "#0f766e",
  },
  {
    slug: "tecnologia-e-ia",
    name: "Tecnologia e IA",
    description: "Ferramentas, automação, segurança e o impacto da inteligência artificial.",
    color: "#2563eb",
  },
  {
    slug: "mundo",
    name: "Mundo",
    description: "Contexto internacional com foco em impacto local.",
    color: "#7c3aed",
  },
  {
    slug: "financas",
    name: "Finanças",
    description: "Guias práticos sobre pagamentos, bancos, investimentos e renda.",
    color: "#ca8a04",
  },
  {
    slug: "esportes",
    name: "Esportes",
    description: "Futebol, Olimpíadas, modalidades e os bastidores do esporte no Brasil e no mundo.",
    color: "#16a34a",
  },
  {
    slug: "entretenimento",
    name: "Entretenimento",
    description: "Cinema, séries, streaming, música e a cultura pop que move as conversas.",
    color: "#db2777",
  },
  {
    slug: "games",
    name: "Games",
    description: "Jogos, consoles, eSports e o universo gamer explicado sem complicação.",
    color: "#9333ea",
  },
];

export const articles: Article[] = [
  {
    slug: "pix-automatico-como-funciona-o-que-muda-pagamentos",
    headline: "Pix automático: como funciona e o que muda nos pagamentos",
    description:
      "Entenda o modelo de autorizacao recorrente, os cuidados de segurança e como empresas podem se preparar.",
    category: "financas",
    author: "Redação Fato Nacional",
    publishedAt: "2026-06-20T10:00:00.000Z",
    readingTime: "5 min",
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1600&q=80",
    tags: ["Pix", "Pagamentos", "Servicos"],
    content: [
      "O Pix automático permite autorizar cobrancas recorrentes sem depender de boleto ou cartão. A mudanca reduz friccao para contas de consumo, mensalidades e assinaturas.",
      "A principal diferenca esta no controle: o usuário aprova a regra de cobranca e pode cancelar a autorizacao pelo canal do banco. Empresas precisam informar valores, periodicidade e dados de identificacao com clareza.",
      "Para publicar sobre o tema com segurança, a redacao deve priorizar fontes oficiais, atualizar datas e evitar prometer disponibilidade antes da confirmacao operacional de cada instituição.",
    ],
  },
  {
    slug: "agentes-de-ia-na-redacao-fluxo-editorial-revisao-humana",
    headline: "Agentes de IA na redacao: fluxo editorial com revisao humana",
    description:
      "Como organizar agentes para pauta, pesquisa, escrita, checagem e SEO mantendo rastreabilidade.",
    category: "tecnologia-e-ia",
    author: "Equipe de Produto Editorial",
    publishedAt: "2026-06-18T12:00:00.000Z",
    readingTime: "7 min",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80",
    tags: ["IA", "Redacao", "SEO"],
    content: [
      "Um fluxo editorial com agentes funciona melhor quando cada etapa tem insumos, criterios e saidas verificaveis. O objetivo não e substituir editoria, mas reduzir trabalho repetitivo.",
      "A pauta deve nascer de sinais de tendencia, lacunas de busca e relevancia local. Em seguida, agentes de pesquisa coletam fontes e estruturam alegacoes para revisao.",
      "A decisão final precisa continuar humana em temas sensiveis. Logs de agente, fontes e pontuacoes de risco ajudam a auditar o processo depois da publicacao.",
    ],
  },
  {
    slug: "calendario-editorial-semanal-21-pautas-sem-canibalizacao",
    headline: "Calendario editorial semanal: 21 pautas sem canibalizacao",
    description:
      "Modelo prático para distribuir temas por intencao de busca e evitar concorrencia interna.",
    category: "tecnologia-e-ia",
    author: "Mesa de Planejamento",
    publishedAt: "2026-06-16T09:30:00.000Z",
    readingTime: "6 min",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80",
    tags: ["Planejamento", "SEO", "Conteudo"],
    content: [
      "Um calendario eficiente separa noticia, explicador, servico e guia. Essa divisao impede que varios textos disputem a mesma palavra-chave primaria.",
      "A matriz semanal deve equilibrar atualidade, potencial evergreen e temas de alta conversao. Cada pauta precisa de uma consulta principal e de consultas secundarias complementares.",
      "A revisao semanal deve arquivar temas fracos, atualizar textos vencidos e registrar por que uma pauta entrou ou saiu da fila.",
    ],
  },
  {
    slug: "regulamentacao-ia-brasil-impacto-empresas-direitos",
    headline: "Regulamentação de IA no Brasil: o que muda para empresas e cidadãos",
    description:
      "Senado acelera discussão do marco regulatório da inteligência artificial. Entenda as obrigações, direitos e classificação de risco.",
    category: "tecnologia-e-ia",
    author: "Diretoria de Inovação",
    publishedAt: "2026-06-25T14:00:00.000Z",
    readingTime: "6 min",
    image:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80",
    tags: ["Regulamentação", "IA", "Brasil"],
    content: [
      "O projeto de lei que cria o marco regulatório da Inteligência Artificial no Brasil avança no Senado, dividindo opiniões de especialistas e entidades empresariais sobre o nível de restrição.",
      "A proposta classifica as aplicações de IA por níveis de risco: risco excessivo (proibidas), alto risco (com regras rígidas de transparência e auditoria) e risco baixo. Empresas que usam IA para recrutamento ou avaliação de crédito estarão sob vigilância estrita.",
      "A decisão de regular visa proteger direitos fundamentais sem sufocar a inovação nacional. Espera-se que a aprovação final crie uma autoridade fiscalizadora de tecnologia nos próximos meses."
    ],
  },
  {
    slug: "inflacao-alimentos-brasil-previsao-segundo-semestre",
    headline: "Inflação de alimentos no Brasil: projeções para o segundo semestre",
    description:
      "Como as condições climáticas adversas e o dólar devem afetar a cesta básica e as decisões de compra das famílias brasileiras.",
    category: "brasil",
    author: "Mesa de Economia",
    publishedAt: "2026-06-24T08:30:00.000Z",
    readingTime: "5 min",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80",
    tags: ["Inflação", "Alimentos", "Economia"],
    content: [
      "A inflação do grupo de alimentação no domicílio deve manter pressão sobre o bolso do consumidor devido a estiagens prolongadas nas regiões produtoras.",
      "Itens básicos como arroz, feijão e legumes têm demonstrado volatilidade de preços nas centrais de abastecimento. Economistas apontam que a valorização cambial encarece fertilizantes importados, gerando repasse no varejo.",
      "Consumidores têm adaptado suas estratégias, optando por marcas locais e substituições sazonais. O mercado projeta estabilização apenas para o fim do último trimestre."
    ],
  },
  {
    slug: "guerra-comercial-chips-tecnologia-global-consequencias",
    headline: "A nova fase da guerra dos semicondutores e os impactos no varejo global",
    description:
      "Restrições de exportação de chips de última geração geram reajuste na cadeia logística e preços de eletrônicos.",
    category: "mundo",
    author: "Correspondente Internacional",
    publishedAt: "2026-06-23T16:15:00.000Z",
    readingTime: "8 min",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80",
    tags: ["Chips", "Tecnologia", "Mundo"],
    content: [
      "A disputa global pelo controle de fabricação de microchips atinge nova temperatura com novos limites de exportação impostos entre grandes blocos econômicos.",
      "A concentração de fundições na Ásia torna a cadeia suscetível a tensões geopolíticas. Montadoras e fabricantes de eletrônicos de consumo buscam diversificar fornecedores no ocidente.",
      "Analistas estimam que essa transição fabril levará anos, resultando em custos temporários de produção mais elevados e prazos de entrega estendidos para hardware avançado."
    ],
  },
  {
    slug: "taxa-selic-decisao-copom-impacto-investimentos-renda-fixa",
    headline: "Decisão do Copom sobre a taxa Selic: onde investir na Renda Fixa",
    description:
      "Com a manutenção dos juros em patamar elevado, analistas indicam as melhores opções entre Tesouro Direto, CDBs e LCIs.",
    category: "financas",
    author: "Analista Financeiro",
    publishedAt: "2026-06-22T11:00:00.000Z",
    readingTime: "6 min",
    image:
      "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1600&q=80",
    tags: ["Selic", "Investimentos", "Finanças"],
    content: [
      "A decisão recente do Comitê de Política Monetária de manter a taxa de juros básica da economia sinaliza atratividade contínua para ativos conservadores.",
      "Títulos atrelados ao IPCA continuam sendo recomendados para blindagem de patrimônio no longo prazo, enquanto papéis pós-fixados se beneficiam no curto prazo.",
      "Especialistas sugerem cautela com alongamento excessivo de prazos sem liquidez diária, recomendando diversificação em emissores com rating de crédito AAA."
    ],
  },
];

// Editorial desks with real bios, coverage areas and review process (E-E-A-T).
export type AuthorProfile = {
  slug: string;
  name: string;
  role: string;
  bio: string;
  scope: string;
  sources: string;
  review: string;
  /** Explicit editorial criteria for this desk (E-E-A-T). */
  criteria: string[];
};

export const authorProfiles: AuthorProfile[] = [
  {
    slug: "mesa-de-economia",
    name: "Mesa de Economia",
    role: "Economia, juros e finanças pessoais",
    bio: "A Mesa de Economia do Fato Nacional acompanha juros, inflação, mercado de trabalho e finanças pessoais, traduzindo dados oficiais do IBGE, do Banco Central e do Tesouro Nacional em informação prática para o leitor. Cada conteúdo prioriza fontes primárias, exemplos concretos e a checagem de todo número citado, sem prometer rentabilidade nem fazer recomendação individual de investimento.",
    scope: "Macroeconomia, inflação, juros, Copom, consumo, renda fixa e finanças pessoais.",
    sources: "Banco Central, IBGE, Tesouro Direto, CVM, B3, FGC, Receita Federal, Dieese, Conab e Cepea.",
    review:
      "Conteúdos financeiros (YMYL) ficam fora do portal público até terem revisão humana identificada e vinculada à versão aprovada. Têm caráter educativo e não constituem recomendação individual de investimento. Correções: contato@fatonacional.com.",
    criteria: [
      "Todo dado numérico (Selic, IPCA, limites do FGC, alíquotas de IR) é conferido na fonte oficial e citado com link.",
      "Datas explícitas: taxas e índices vêm sempre com o mês/ano de referência, nunca apenas 'hoje'.",
      "Disclaimer obrigatório: nenhum conteúdo recomenda compra/venda individual nem promete rentabilidade.",
      "Comparações de produtos são apresentadas em tabela, com liquidez, imposto e risco lado a lado.",
      "Temas sensíveis só ficam publicamente disponíveis após revisão humana registrada para a versão exibida.",
    ],
  },
  {
    slug: "mesa-de-tecnologia",
    name: "Mesa de Tecnologia",
    role: "Tecnologia, inteligência artificial e regulação",
    bio: "A Mesa de Tecnologia cobre inteligência artificial, regulação digital, plataformas, segurança e inovação, com foco no impacto real para empresas e cidadãos. Diferencia com rigor projeto de lei, lei aprovada e norma em vigor, e evita exageros sobre o que a tecnologia promete entregar.",
    scope: "Inteligência artificial, regulação digital, plataformas, segurança e inovação.",
    sources: "Câmara dos Deputados, Senado, ANPD, Ministério da Ciência e Tecnologia, Google Search Central e documentação oficial.",
    review:
      "Temas regulatórios são checados na fonte legislativa, com status datado. O uso de IA na produção é declarado quando pertinente. Correções: contato@fatonacional.com.",
    criteria: [
      "Status legislativo sempre datado e diferenciado (projeto de lei x lei aprovada x norma em vigor).",
      "Fonte primária: tramitação citada direto na Câmara, no Senado ou no órgão regulador.",
      "Sem hype: a matéria explica limites e riscos, não só o potencial da tecnologia.",
      "Impacto prático para empresas e cidadãos vem antes do jargão técnico.",
      "O uso de IA na própria produção é declarado com transparência.",
    ],
  },
  {
    slug: "mesa-internacional",
    name: "Mesa Internacional",
    role: "Mundo, economia global e geopolítica",
    bio: "A Mesa Internacional cobre economia global, geopolítica e tecnologia, sempre conectando os fatos ao impacto no Brasil. Prioriza agências de referência e fontes oficiais, com datas exatas dos acontecimentos e cuidado para não repetir afirmações sem confirmação.",
    scope: "Geopolítica, economia global, EUA, China, Europa e América Latina.",
    sources: "Reuters, AP, agências públicas, governos, organismos multilaterais, empresas e relatórios de mercado.",
    review:
      "Análise internacional contextualizada para o leitor brasileiro, com fontes identificadas e datadas. Correções: contato@fatonacional.com.",
    criteria: [
      "Todo fato relevante traz data exata e fonte identificável.",
      "O texto sempre explicita o impacto do acontecimento para o Brasil.",
      "Afirmações sensíveis exigem mais de uma fonte de referência.",
      "Contexto geopolítico antes de opinião; fato, contexto e análise ficam separados.",
      "Fontes internacionais são creditadas nominalmente.",
    ],
  },
  {
    slug: "redacao-fato-nacional",
    name: "Redação Fato Nacional",
    role: "Padrões editoriais, transparência e bastidores",
    bio: "Responsável pela linha editorial, pelos padrões de qualidade e pela transparência do Fato Nacional — incluindo a política de correções, a revisão em português e a governança do uso de inteligência artificial na redação.",
    scope: "Transparência, padrões editoriais, guias internos e conteúdo institucional.",
    sources: "Documentos internos do Fato Nacional, Google Search Central e referências de veículos reconhecidos.",
    review:
      "Define os critérios de pauta, fontes, redação, automação, registro de revisão e publicação. Correções: contato@fatonacional.com.",
    criteria: [
      "Cada artigo informa se possui revisão humana verificável para a versão exibida.",
      "Datas de publicação e de atualização são exibidas em todos os posts.",
      "Erros confirmados são corrigidos de forma transparente, conforme a política de correções.",
      "O uso de IA e a ausência de revisor humano registrado são declarados com transparência.",
      "Conteúdo sensível sem revisão humana vinculada por hash permanece em quarentena pública.",
    ],
  },
  {
    slug: "mesa-de-esportes",
    name: "Mesa de Esportes",
    role: "Futebol, Olimpíadas e modalidades",
    bio: "A Mesa de Esportes do Fato Nacional cobre futebol, Olimpíadas e as principais modalidades, explicando regras, formatos de competição e contexto com linguagem clara, sempre com datas e fontes identificáveis.",
    scope: "Futebol, Olimpíadas, modalidades olímpicas, eSports e bastidores do esporte.",
    sources: "Entidades oficiais (CBF, COB, FIFA, COI), clubes, ligas e agências de notícias.",
    review:
      "Resultados e estatísticas são conferidos em fontes oficiais e datados. Correções: contato@fatonacional.com.",
    criteria: [
      "Placares, datas e estatísticas conferidos em fonte oficial.",
      "Regras e formatos explicados de forma didática para quem não acompanha.",
      "Fato, contexto e opinião ficam separados.",
      "Sem boato: transferências e lesões só com fonte identificável.",
      "Datas explícitas em todo resultado ou calendário.",
    ],
  },
  {
    slug: "mesa-de-cultura",
    name: "Mesa de Cultura",
    role: "Entretenimento, cultura pop e games",
    bio: "A Mesa de Cultura cobre cinema, séries, streaming, música e games, com explicadores, guias e contexto sobre o que movimenta as conversas — sem spoilers gratuitos e sempre creditando as fontes.",
    scope: "Cinema, séries, streaming, música, celebridades, games, consoles e eSports.",
    sources: "Estúdios, plataformas de streaming, desenvolvedoras, veículos especializados e agências.",
    review:
      "Datas de lançamento e fichas técnicas conferidas nas fontes oficiais. Correções: contato@fatonacional.com.",
    criteria: [
      "Datas de lançamento e fichas técnicas conferidas na fonte oficial.",
      "Avisos de spoiler quando necessário.",
      "Explicadores acessíveis a quem não é do meio.",
      "Sem fofoca sem fonte; rumores são sinalizados como tal.",
      "Crédito a estúdios, plataformas e desenvolvedoras.",
    ],
  },
];

const curatedAuthorBySlug: Record<string, string> = {
  "taxa-selic-decisao-copom-impacto-investimentos-renda-fixa": "Mesa de Economia",
  "inflacao-alimentos-brasil-previsao-segundo-semestre": "Mesa de Economia",
  "pix-automatico-como-funciona-o-que-muda-pagamentos": "Mesa de Economia",
  "regulamentacao-ia-brasil-impacto-empresas-direitos": "Mesa de Tecnologia",
  "agentes-de-ia-na-redacao-fluxo-editorial-revisao-humana": "Mesa de Tecnologia",
  "guerra-comercial-chips-tecnologia-global-consequencias": "Mesa Internacional",
  "calendario-editorial-semanal-21-pautas-sem-canibalizacao": "Redação Fato Nacional",
};

// Apply the audit-grade rewritten bodies (rich content, corrected facts,
// official sources, tables, FAQ) + editorial-desk bylines to the curated posts.
// These are seed-authoritative via mapArticle, so they ship via deploy.
for (const article of articles) {
  const body = articleBodies[article.slug];
  if (body) {
    article.headline = body.headline;
    article.seoTitle = body.seoTitle;
    article.metaDescription = body.metaDescription;
    article.summary = body.summary;
    article.description = body.summary;
    article.tags = body.tags;
    article.contentHtml = body.contentHtml;
    article.updatedAt = body.updatedAt;
    article.readingTime = `${Math.max(1, Math.round(body.wordCount / 200))} min`;
    article.author = curatedAuthorBySlug[article.slug] ?? article.author;
    article.image = `/api/media/articles/${article.slug}.webp`;
    article.imageAlt = `Ilustração editorial sobre ${body.headline}`;
    article.imageCredit = "Ilustração conceitual gerada por IA · Fato Nacional";
  }
}

// New cluster posts (already complete; not in the DB, merged via getArticles).
articles.push(...clusterArticles, ...clusterArticles2, ...clusterArticles3, ...clusterArticles4);

// Guarantee dateModified >= datePublished everywhere: a date-only updatedAt like
// "2026-06-30" parses as UTC midnight and, in America/Sao_Paulo, would render as the
// previous day (and sit before publishedAt in the schema). Normalize to the full
// publishedAt timestamp whenever updatedAt is missing or not strictly later.
for (const article of articles) {
  const pub = new Date(article.publishedAt).getTime();
  const upd = article.updatedAt ? new Date(article.updatedAt).getTime() : NaN;
  if (Number.isNaN(upd) || upd < pub) {
    article.updatedAt = article.publishedAt;
  }
}

export const adminMetrics = [
  { label: "Artigos prontos", value: "18", delta: "+6 na semana" },
  { label: "Pautas monitoradas", value: "142", delta: "37 em alta" },
  { label: "Score medio SEO", value: "86", delta: "+4 pts" },
  { label: "Revisoes pendentes", value: "7", delta: "2 alto risco" },
];
