# Fato Nacional — Operação editorial: 5 posts/dia com qualidade (anti-spam)

> Objetivo: publicar **5 posts/dia** sem cair em "abuso de conteúdo em escala".
> A regra do Google não é sobre *quantidade* — é sobre *valor por página*. Aqui,
> cada post precisa passar no **portão de qualidade** antes de ir ao ar. Se não
> passar, **não publica**.

## 1. Os pilares (autoridade temática + variedade que gera tráfego)
Núcleo "sério" (autoridade, E-E-A-T, AdSense de alto valor):
1. **Finanças pessoais** (renda fixa, crédito, dívidas, impostos, investimentos)
2. **Economia do dia a dia** (Selic, inflação, salário, câmbio, FGTS)
3. **Tecnologia e IA** (IA, segurança digital, privacidade, ferramentas)
4. **Brasil / serviços públicos** (INSS, benefícios, documentos, calendários)
5. **Mundo com impacto no Brasil** (Fed, comércio global, geopolítica → efeito local)

Variedade (temas mais comentados do mundo — volume, Discover, público amplo):
6. **Esportes** (futebol, Olimpíadas, modalidades, eSports)
7. **Entretenimento** (cinema, séries, streaming, música, cultura pop)
8. **Games** (jogos, consoles, eSports, guias)

> Regra da variedade: mesma exigência de qualidade. Evergreen ("o que é / como funciona / história / guia") a automação gera; **resultado de jogo, lançamento e fofoca do dia = manual** (fato real, com fonte e data). Nunca inventar placar, data de lançamento ou boato.

## 2. A grade diária (5 posts) — mistura, não repetição
Para NÃO parecer fábrica de notícia rasa, cada dia mistura tipos e intenções:

| # | Tipo | Objetivo | Barra de score |
|---|------|----------|----------------|
| 1 | **Guia evergreen** (1.300–2.500 palavras) | SEO de longo prazo | ≥ 92 (YMYL) / ≥ 85 |
| 2 | **Explicador** (900–1.500) | Responder "o que é / como funciona" | ≥ 92 / ≥ 85 |
| 3 | **Comparativo** (com tabela) | "X ou Y: qual vale mais" | ≥ 92 / ≥ 85 |
| 4 | **Serviço prático** (calendário, passo a passo) | Utilidade + compartilhável | ≥ 92 / ≥ 85 |
| 5 | **Explicador/atualização leve** | Fresco + reforço de cluster | ≥ 92 / ≥ 85 |

- **Regra de ouro:** de cada 5, **no mínimo 2 são evergreen fortes** (notícia morre; evergreen traz tráfego por meses).
- **Notícia quente real** (Copom, nova regra do Pix, decisão do BC): **entra manualmente via /cms** quando o fato acontecer — automação NÃO inventa fato/data. Ao publicar no /cms, a purga de cache dispara sozinha.
- Horários de publicação são escalonados ao longo do dia (07h, 10h, 13h, 16h, 19h BRT) para não sair tudo de uma vez.

## 3. Portão de qualidade (obrigatório — "se não passar, não publica")
Verificado automaticamente por `src/lib/agents/score.ts` (`scoreArticle`) + revisão multiagente (escrever → editor-chefe ≥92 → corrigir):
- [ ] Título único + slug único + meta description única (checar contra os slugs existentes = anti-canibalização)
- [ ] Intenção de busca única (não repetir assunto já coberto)
- [ ] Fonte oficial/confiável linkada (mín. 3 em YMYL, na **página específica** do dado)
- [ ] ≥ 800 palavras (guia/explicador)
- [ ] Resumo em 5 pontos + FAQ (4 pares) + ao menos 1 `<table>` quando comparar
- [ ] ≥ 3 links internos contextuais
- [ ] Imagem 1600×900 (WebP, ≥1200px) + alt descritivo
- [ ] canonical absoluto (www) + `NewsArticle`/`Article` + `BreadcrumbList` + `FAQPage`
- [ ] `datePublished` correto e `dateModified` **≥** `datePublished` (ISO 8601)
- [ ] **Acentuação PT-BR perfeita** (o revisor reprova se faltar acento)
- [ ] Sem "hoje/atualmente" sem data (usar "em mês/ano")
- [ ] Sem recomendação financeira individual + disclaimer em YMYL

## 4. Google News / sitemap de notícias
- `news-sitemap.xml` já filtra **só artigos das últimas 48h** (`src/app/news-sitemap.xml/route.ts`).
- `sitemap.xml` mantém TODOS os posts (não expira).
- Nada a fazer manualmente — a janela de 48h é automática.

## 5. Ritmo recomendado
- **Fase 1 (primeiros ~30 dias):** rodar e observar o Search Console (indexação).
- Se o Google indexar bem, manter 5/dia; se acumular "descoberta / não indexada", reduzir e reforçar qualidade/links.

---

## 6. Backlog de pautas (fila — sem canibalizar o que já existe)
Marcar `[x]` quando publicado. Reabastecer quando restarem < 10.

### Finanças pessoais
- [ ] O que é o CET (Custo Efetivo Total) e como comparar empréstimos — explicador
- [ ] Reserva de emergência: quanto guardar e onde deixar — guia
- [ ] PGBL x VGBL: qual previdência privada escolher — comparativo
- [ ] Consórcio x financiamento: qual compensa — comparativo
- [ ] Empréstimo consignado: o que é, taxas e cuidados — explicador
- [ ] Financiamento imobiliário: SAC x Price, qual escolher — comparativo
- [ ] Portabilidade de crédito e de salário: como fazer — serviço
- [ ] Como declarar o Imposto de Renda: quem declara e prazos — serviço

### Economia do dia a dia
- [ ] Salário mínimo 2026: valor, reajuste e o que ele indexa — explicador
- [ ] Como funciona o FGTS: saldo, saques e modalidades — serviço
- [ ] 13º salário: quem tem direito, cálculo e datas — serviço
- [ ] Dólar alto: como afeta preços, viagens e investimentos — explicador
- [ ] O que é a taxa de câmbio e como acompanhar — explicador

### Brasil / serviços públicos
- [ ] Calendário de pagamentos do INSS: como consultar — serviço
- [ ] Como consultar e regularizar o CPF — serviço
- [ ] Bolsa Família: calendário, valor e regras de permanência — serviço
- [ ] Como agendar atendimento e perícia no INSS — serviço
- [ ] Auxílio por incapacidade (antigo auxílio-doença): como solicitar — serviço

### Tecnologia e IA
- [ ] Golpes digitais mais comuns e como se proteger — guia
- [ ] Autenticação em dois fatores (2FA): o que é e como ativar — explicador
- [ ] LGPD para o cidadão: seus direitos sobre os dados — guia
- [ ] Como usar IA (ChatGPT e afins) com segurança e privacidade — explicador
- [ ] Como reconhecer notícias falsas e conteúdo gerado por IA — guia

### Mundo com impacto no Brasil
- [ ] Como as decisões de juros do Fed (EUA) afetam o Brasil — explicador
- [ ] Tarifas e comércio global: o efeito no preço que você paga — explicador
- [ ] O que é o risco-país e por que ele mexe com os juros — explicador

### Esportes (evergreen)
- [ ] Como funciona a Liga dos Campeões (Champions League): formato e fases — explicador
- [ ] O que é o VAR e como funciona no futebol — explicador
- [ ] Como funcionam os Jogos Olímpicos: modalidades, medalhas e sedes — guia
- [ ] O que é eSports e como se tornou profissão — explicador
- [ ] Como funciona o Campeonato Brasileiro: pontos, rebaixamento e Libertadores — explicador

### Entretenimento (evergreen)
- [ ] Como funcionam os principais streamings (Netflix, Prime, Disney+, Max): o que muda — comparativo
- [ ] O que é o Oscar e como funciona a votação da Academia — explicador
- [ ] Guia para começar a ver anime: por onde e onde assistir — guia
- [ ] Como a música chega ao streaming e como os artistas ganham — explicador
- [ ] O que é cultura pop e por que ela move a internet — explicador

### Games (evergreen)
- [ ] PlayStation, Xbox ou Nintendo Switch: qual console escolher — comparativo
- [ ] O que é o Game Pass e como funcionam as assinaturas de jogos — explicador
- [ ] Como funciona o cross-play entre consoles e PC — explicador
- [ ] O que são jogos free-to-play e como eles ganham dinheiro — explicador
- [ ] Guia para montar um PC gamer de entrada — guia
