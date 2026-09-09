# Relatório de Conformidade com o PRD — Nexo Jornal IA

> Auditoria do código real (não da intenção) contra o PRD "Stack definitiva recomendada".
> Data: 2026-06-29. Método: 14 auditores independentes lendo o código, com evidência por arquivo.

## Conformidade geral: **19 / 100**

| # | Dimensão | Score | Resumo |
|---|----------|:----:|--------|
| 1 | Monorepo & apps | 38 | 3 apps (web+cms fundidos em `portal`); só `packages/shared`; sem docker/docs/CI; Node 24 + TS strict + pnpm/Turborepo ✓ |
| 2 | Portal web | 55 | App Router/SSR/SSG/ISR ✓, sitemaps ✓, NewsArticle JSON-LD ✓. Falta: busca, RSS, pillar pages, tags pages, autores/[slug], Analytics/AdSense; Tailwind instalado mas não usado |
| 3 | Collections & estados | 27 | 9/~24 collections; 5/16 estados de artigo |
| 4 | Banco (Neon/pgvector/FTS) | 18 | Postgres Railway (não Neon); sem pgvector/HNSW; sem full-text PT/unaccent; Prisma duplicado com Payload |
| 5 | Filas & automação | 6 | worker não usa BullMQ; 1 fila vs 17; sem DLQ/idempotência/backoff/timeout/custo |
| 6 | Camada de IA | 5 | 1 cliente OpenAI; sem AI SDK, sem roteador, sem modelo por tarefa; scores hardcoded |
| 7 | Coleta de tendências | 5 | inexistente; `rss-parser` instalado e nunca usado; Sources é stub |
| 8 | Arquivos & imagens (R2) | 18 | sem R2/S3; Media em disco local; sharp ✓ mas sem pipeline (AVIF/WebP/blurhash/strip) |
| 9 | Infra & cache | 22 | Railway ✓; zero Cloudflare; cache só aproximado; sem purge on-update |
| 10 | SEO em código | 18 | sem `packages/seo`; só NewsArticle; sem canonical builder/breadcrumb/org/person; sem auditorias |
| 11 | Search Console | 30 | sitemaps/robots ✓; sem API Search Console; sem RSS |
| 12 | Observabilidade | 7 | sem OTel/Sentry/Pino; AgentRuns órfão; custo/tokens nunca capturados |
| 13 | Testes & avaliação | 4 | sem Vitest/Playwright; só smoke scripts; sem base de avaliação de agentes |
| 14 | Segurança | 12 | só auth básico; RBAC não aplicado; sem 2FA/Cloudflare Access/rate-limit; PAYLOAD_SECRET com fallback inseguro |

## Roadmap priorizado (do que dá ranqueamento primeiro)

**Fase 1 — Motor de conteúdo + SEO (o que produz e ranqueia matérias): ✅ CONCLUÍDA**
- [x] Roteador de modelos por agente (OpenCode Zen) — `src/lib/agents/model-router.ts`
- [x] Provider Zen com chat.completions + structured JSON + captura de tokens — `src/lib/agents/provider.ts`
- [x] Geração + avaliação (rubrica SEO 8 critérios) + revisão dos 7 artigos (6/7 ≥85)
- [x] Renderização rica (contentHtml long-form) no lugar dos 3 parágrafos/título falsos
- [x] JSON-LD: NewsArticle + **Organization (NewsMediaOrganization) + WebSite (SearchAction) + Breadcrumb + FAQPage + Person**
- [x] RSS feed (`/rss.xml`), **busca** (`/busca`), páginas de **tag** e de **autor**
- [x] Box E-E-A-T (autoria/transparência/políticas/data) + malha interna (autor + tags linkados)
- [x] Logo + metadataBase + canonical

**Fase 2 — Automação editorial + credibilidade (em andamento):**
- [x] **16 estados de artigo** (enum_articles_status ampliado p/ 17 valores; config com 16 opções)
- [x] **Observabilidade**: `agent_runs` gravando agente/modelo/provider/tokens/custo/duração — verificado ao vivo (era órfã)
- [x] **AI layer ligado e testado**: router por agente → OpenCode Zen → captura de tokens → custo → persistência
- [x] Renderização rica + índice dinâmico + Compartilhar/Leia também + next/image (AVIF/WebP) + dedupe FAQ
- [ ] Collections faltantes (FactChecks, SeoAudits, ModelExecutions, EditorialPlans, ArticleBriefs, RiskReviews, TrendSignals…) — exige criação de tabelas
- [ ] Filas BullMQ reais (writing/fact-check/seo-audit/publication) com idempotência, retry, DLQ, backoff; scheduler com crons
- [x] **Ingestão (Google News RSS)** — `src/lib/ingest/google-news.ts` + rota `/api/cron/ingest` (token); **Topics=20 + Sources=20** populados de tendências reais (collections que estavam órfãs agora em uso). Falta só: setar `INIT_SCHEMA_TOKEN` + cron Railway p/ rodar sozinho.
- [x] **Refino E-E-A-T**: 7 títulos com acentos corrigidos + seção "Fontes e referências" com fontes oficiais reais (verificadas) — falta só Pix ≥85
- [x] **Testes Vitest** (18 testes: scoring, slug, índice/TOC, custo, roteador de modelos) + **GitHub Actions CI** (`.github/workflows/ci.yml`)
- [x] **RBAC** (staff write / admin delete / Users admin-gated) + **PAYLOAD_SECRET** sem fallback inseguro
- [ ] Base de avaliação de agentes (eval dataset); logging Pino; roles author/automation (precisa migração de enum)

**Fase 3 — Plataforma:**
- [x] **pgvector + pg_trgm + unaccent ATIVADOS no Railway Postgres** (sem Neon!) + **dedup/anti-canibalização** (`src/lib/dedup/similarity.ts`) via pg_trgm — preciso (duplicata=1.0 bloqueia, esporte=0.19 ignora). pgvector pronto p/ embeddings semânticos quando houver provedor (Zen é chat-only).
- [ ] ~~Neon~~ — **dispensado**, Railway Postgres cobre (pgvector/FTS nativos)
- [x] **Domínio `fatonacional.com` + Cloudflare CDN no ar** (via API): DNS apontado p/ Railway, cert válido, proxy/CDN (edge São Paulo), Brotli/HTTP3/0-RTT/Always-HTTPS/TLS1.2, SSL Full. Canonical/OG/sitemap/robots todos no domínio novo. www validando.
- [ ] **R2** — falta o usuário ATIVAR no painel Cloudflare (1 clique + cartão); código já pronto (env-gated). Depois: bucket + pipeline de imagens.
- [ ] www 301 redirect (token sem permissão de Redirect Rules) + Sentry/Search Console/embeddings (contas do usuário)
- [ ] Cloudflare CDN/WAF + R2 (storage/imagens) — conta Cloudflare
- [ ] Search Console API (OAuth + verificação) — conta Google
- [ ] Sentry (DSN) + observabilidade externa; GPT Image 2; Google Trends API (alpha)
