import {
  calculateArticleQuality,
  calculateTopicScore,
  classifyTopic,
  type AgentKind,
} from "@nexo/shared";
import { generateForAgent } from "./provider";
import { logAgentRun } from "./observability";

const agentPrompts: Record<AgentKind, string> = {
  collector: "Colete sinais de tendencia e fontes primarias.",
  radar: "Priorize oportunidades por crescimento recente e relevancia Brasil.",
  topic_analyst: "Pontue a pauta por intencao, risco e potencial SEO.",
  editorial_planner: "Transforme a pauta em briefing editorial auditavel.",
  researcher: "Liste fontes, alegacoes e lacunas de verificacao.",
  serp_analyst: "Analise SERP, concorrentes e lacunas de conteudo.",
  writer: "Escreva rascunho claro, factual e orientado a busca.",
  editor: "Revise clareza, estrutura, tom e duplicidade.",
  fact_checker: "Cheque alegacoes, datas, numeros e atribuicoes.",
  seo_specialist: "Otimize titulo, meta description, headings e links internos.",
  image: "Sugira imagem editorial segura e texto alternativo.",
  publication_auditor: "Audite risco, fontes, score de qualidade e conformidade.",
  publisher: "Prepare checklist final e decisao de publicacao.",
};

export async function runAgent(kind: AgentKind, topic: string) {
  const start = Date.now();
  const generated = await generateForAgent(kind, `Tema: ${topic}`, agentPrompts[kind]);
  const topicScore = calculateTopicScore({
    recentGrowth: 12,
    growthProbability: 12,
    brazilRelevance: 8,
    seoPotential: 13,
    discoverPotential: 8,
    commercialIntent: 6,
    sourceQuality: 8,
    competitorOpportunity: 4,
    originalContentPotential: 8,
  });
  const quality = calculateArticleQuality({
    factualAccuracy: 23,
    originalValue: 17,
    searchIntent: 14,
    editorialClarity: 9,
    authorityTransparency: 8,
    onPageSeo: 8,
    technicalSeo: 7,
    imageDiscover: 4,
    hasSevereFactualError: false,
    riskLevel: "low",
  });

  const durationMs = Date.now() - start;

  await logAgentRun({
    agent: kind,
    provider: generated.provider,
    model: generated.model,
    status: "completed",
    durationMs,
    inputTokens: generated.usage?.inputTokens,
    outputTokens: generated.usage?.outputTokens,
    input: { topic },
    output: { text: generated.text.slice(0, 2000) },
  });

  return {
    kind,
    topic,
    task: generated.task,
    model: generated.model,
    provider: generated.provider,
    usage: generated.usage,
    durationMs,
    output: generated.text,
    topicScore,
    recommendation: classifyTopic(topicScore),
    quality,
    completedAt: new Date().toISOString(),
  };
}
