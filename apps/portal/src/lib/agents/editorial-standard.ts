/**
 * Canonical editorial quality standard for the Fato Nacional, derived from the
 * editorial audit (29/06/2026). Every article the pipeline produces MUST follow
 * this. Wire `buildProductionPrompt` into the writer agent and run
 * `EDITOR_REVIEW_PROMPT` as a mandatory pre-publish gate.
 *
 * The goal: never again publish thin, generic, unsourced or unaccented content.
 */

export const EDITORIAL_GOLDEN_RULES = [
  "Português do Brasil com acentuação correta — revisar antes de publicar. Nada de 'By', 'By autor' ou anglicismos: use 'Por'.",
  "Nunca inventar fontes. Todo dado numérico precisa de fonte oficial/confiável citada no corpo (com link para a PÁGINA ESPECÍFICA do dado, não a home do órgão).",
  "Datas explícitas: toda taxa, índice ou decisão vem com o mês e ano de referência ('em junho de 2026'), NUNCA apenas 'hoje' ou 'atualmente'.",
  "Promessa do título é contrato: se o título traz um número ('10 estratégias', '7 passos', '5 erros'), o corpo entrega EXATAMENTE esse número em uma lista <ol> numerada e visível. Caso contrário, ajuste o título.",
  "Separar fato, contexto e análise. Evitar 'especialistas dizem' sem identificar quem.",
  "Temas YMYL (finanças, saúde, direito, política, segurança) exigem disclaimer, revisão humana reforçada e NO MÍNIMO 3 fontes oficiais distintas.",
  "Incluir resumo e H2/H3 úteis. Tabela, FAQ, checklist ou calculadora entram somente quando ajudam a intenção de busca; componentes vazios ou decorativos são proibidos.",
  "Profundidade é informação nova e verificável, não contagem bruta: parágrafos repetidos, paráfrases circulares e clichês não contam.",
  "Mínimo de profundidade: notícia 400–700, explicador 900–1.400, guia evergreen 1.300–2.500 palavras.",
  "Links internos contextuais: use apenas alvos publicados e validados recebidos no brief (idealmente 2 a 4); nunca invente slug para cumprir cota.",
  "TODO post exibe 'Publicado em' E 'Atualizado em' (datePublished + dateModified), mesmo que na mesma data.",
  "Imagem: 16:9, ≥1200px, WebP, com alt descritivo e legenda; sem rosto/flagrante falso em notícia real.",
] as const;

/**
 * The exact HTML contract every generated article body must follow. Import this
 * into any generation workflow so the rules live in ONE place and never drift.
 * (Baked from the technical audit of 30/06/2026.)
 */
export const ARTICLE_HTML_RULES = `ESTRUTURA HTML EDITORIAL (sem <html>/<body>, comecando direto no conteudo):
1. Lead: <p class="article-lead">...</p> (1 paragrafo forte).
2. <h2>Resumo em 5 pontos</h2> + <ul> com 5 <li> (use <strong> nos numeros-chave, sempre com mes/ano).
3. Se YMYL (financas/saude/direito/politica/seguranca): <blockquote> com aviso ("nao constitui recomendacao...").
4. Secoes <h2>/<h3> densas. Toda comparacao vira <table> com <thead>/<tbody> — nunca texto imitando tabela.
5. PROMESSA DO TITULO: se o titulo tem um numero (ex.: "10 estrategias"), inclua uma lista <ol> com EXATAMENTE esse numero de <li>.
6. FAQ e tabela sao condicionais: inclua somente quando responderem a uma necessidade real. Se presentes, devem ter perguntas, respostas, cabecalhos e celulas preenchidos; wrappers vazios reprovam.
7. <h2>Fontes consultadas</h2> com <ul> de links REAIS para a PAGINA ESPECIFICA do dado (nao a home). YMYL: minimo 3 fontes oficiais distintas.
8. Datas com mes/ano explicito ("em junho de 2026"), nunca "hoje". Use somente os links internos validados fornecidos no brief; nunca invente slug para cumprir quantidade.
9. Nao repetir paragrafos nem inflar o texto com variacoes da mesma ideia. Cada secao deve acrescentar fato, evidencia, exemplo, excecao ou criterio de decisao.`;

export type ContentType = "noticia" | "explicador" | "guia" | "analise" | "servico";

export function buildProductionPrompt(input: {
  tema: string;
  categoria: string;
  tipo: ContentType;
  fatos?: string;
  fontes?: string[];
}): string {
  return [
    'Você é jornalista sênior + editor de SEO do "Fato Nacional". Crie um artigo com foco em SEO, E-E-A-T e utilidade real, seguindo o padrão editorial do portal.',
    `Tema: ${input.tema}`,
    `Categoria: ${input.categoria}`,
    `Tipo: ${input.tipo}`,
    "Público: leitor brasileiro comum; linguagem clara, sem economês/juridiquês excessivo.",
    "",
    "REGRAS OBRIGATÓRIAS:",
    ...EDITORIAL_GOLDEN_RULES.map((r) => `- ${r}`),
    input.fatos ? `\nFATOS VERIFICADOS (use como verdade, não invente):\n${input.fatos}` : "",
    input.fontes?.length ? `\nFONTES OFICIAIS (linkar no corpo):\n${input.fontes.join("\n")}` : "",
    "",
    "ESTRUTURA (HTML semântico, sem <h1>): linha-fina em <p>; <h2>Resumo em 5 pontos</h2> + <ul>;",
    "seções <h2> (O que aconteceu/é; Por que importa; Dados principais; Impacto para o leitor;",
    "Contexto; O que observar agora); tabela comparativa ou FAQ somente quando forem úteis à intenção;",
    "<h2>Fontes consultadas</h2> com <a href> reais para páginas específicas;",
    "<blockquote> de disclaimer quando for YMYL.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Pre-publish editor + fact-check gate. Run on every draft before publishing. */
export const EDITOR_REVIEW_PROMPT = `Você é editor-chefe, revisor de SEO e checador de fatos do Fato Nacional. Audite o artigo antes da publicação.

Critérios:
1. O título entrega exatamente o que promete?
2. Tem profundidade suficiente para o tipo (notícia >=400, explicador/guia >=900 palavras)?
3. Tem fontes oficiais/confiáveis no corpo, com link?
4. Todo dado numérico tem fonte?
5. Há informação original/análise/tabela/exemplo além do óbvio?
6. Há erros de português/acentuação?
7. É tema YMYL (finanças/saúde/direito/política/segurança)? Se sim, há disclaimer e revisão reforçada?
8. O autor/assinatura tem credencial suficiente?
9. Tem resumo, subtítulos, links internos e FAQ?
10. Há data de atualização quando necessário?
11. O texto parece gerado em massa ou é realmente útil?

Entregue: nota 0–10; falhas críticas; melhorias; título melhorado; meta description; FAQ sugerido; fontes a adicionar; checklist final. NÃO aprove abaixo de 8/10.`;

/** Conditions under which the automation MUST NOT auto-publish (audit 10.2). */
export const NO_AUTO_PUBLISH_IF = [
  "Há número ou data sem fonte.",
  "Afirma status de lei/PL/decisão judicial ou taxa econômica sem fonte oficial.",
  "Fala de investimento sem disclaimer.",
  "Cita pessoa/empresa em acusação sem contraditório.",
  "A fonte principal é apenas outro blog, ou a URL da fonte não abre.",
  "Um link externo genérico é apresentado como fonte oficial, ou aponta apenas para a home da instituição.",
  "Há link interno cujo slug não existe no conjunto de artigos publicados.",
  "O volume aparente depende de parágrafos repetidos, paráfrases circulares ou componentes vazios.",
  "Tema YMYL não possui aprovação humana identificada e vinculada à versão revisada.",
  "Falta autor/mesa válida, datePublished ou dateModified.",
  "A imagem não tem alt, ou a categoria está vazia/errada.",
] as const;

/** Pre-publish score weights (audit 10.3). Total = 100. */
export const SCORE_WEIGHTS = {
  fontesOficiais: 20,
  profundidade: 15,
  seoOnPage: 15,
  clareza: 10,
  atualizacao: 10,
  linksInternos: 10,
  autoriaTransparencia: 10,
  uxTabelaFaq: 10,
} as const;

/**
 * The publish bar: auto-publish só com nota >= 85; temas sensíveis (YMYL)
 * exigem >= 92 E revisão humana. Use junto com NO_AUTO_PUBLISH_IF.
 */
export const PUBLISH_SCORE_THRESHOLDS = {
  standard: 85,
  sensitive: 92,
} as const;

export function meetsPublishBar(score: number, sensitive: boolean): boolean {
  if (!Number.isFinite(score) || score < 0 || score > 100) return false;
  return sensitive
    ? score >= PUBLISH_SCORE_THRESHOLDS.sensitive
    : score >= PUBLISH_SCORE_THRESHOLDS.standard;
}
