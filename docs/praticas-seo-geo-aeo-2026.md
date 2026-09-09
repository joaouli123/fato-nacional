# Práticas SEO + GEO + AEO + E-E-A-T 2026 — síntese da pesquisa (2026-07-10)

## writerRules

1. Abra todo artigo com resposta direta de 40-60 palavras imediatamente após o H1: a resposta completa e autossuficiente primeiro, contexto depois. Nunca comece com contextualização vaga.
2. Escreva H2/H3 como a pergunta exata que o usuário faria (espelhando People Also Ask); cada seção deve responder essa pergunta na primeira frase e funcionar lida isoladamente (~100-170 palavras por bloco).
3. Inclua 2-3 estatísticas numéricas específicas por seção relevante, sempre com data e fonte nomeada: 'a Selic está em X% a.a. em julho/2026, segundo o Banco Central' — nunca 'os juros estão altos' ou 'especialistas dizem'.
4. Linke fontes primárias inline no corpo do texto (Banco Central, Receita Federal, INSS, IBGE, Diário Oficial, CVM, ANBIMA) — as referências do fact-check devem aparecer para o leitor, não só em log interno.
5. Use citações diretas entre aspas de especialistas nomeados e identificáveis (economista com CORECON, advogado previdenciário com OAB) em matérias de serviço; nunca invente fala ou pessoa.
6. Todo artigo precisa de valor que NÃO exista nas fontes: cálculo próprio, tabela comparativa original, simulação feita pela redação com data ('simulamos em julho/2026 e as taxas foram X'), ou contexto brasileiro específico. Se o artigo só reorganiza fontes, ele não passa.
7. Coloque a informação mais valiosa nos primeiros 30% do texto; responda as sub-perguntas do tema (valores, prazos, quem tem direito, como consultar) em seções próprias com H2/H3 dedicados — é isso que o query fan-out cita.
8. Use tabelas HTML e listas numeradas para dados comparativos, calendários e passo a passo; guias passo a passo em lista numerada limpa, sem depender de schema HowTo (deprecado).
9. Defina termos explicitamente na primeira menção ('X é...') e use nomes oficiais completos de programas, órgãos e leis (entidades) antes de siglas.
10. Escreva declarativo e fluente, sem hedging excessivo ('pode ser que talvez'), sem keyword stuffing e sem encher linguiça — padding não gera visibilidade e stuffing degrada.
11. Título descritivo e sem sensacionalismo/clickbait (requisito de Discover); prometa exatamente o que o texto entrega.
12. Nunca use datas futuras, nunca afirme valor/regra sem fonte datada, nunca escreva 'de acordo com especialistas' sem nome, nunca copie estrutura idêntica de artigo anterior do site.
13. Em temas quentes, priorize frescor real: dado mais recente disponível, com a data do dado no texto; em guias perenes, inclua bloco 'O que mudou nesta atualização' quando revisar.
14. Mantenha consistência factual com o restante do site: mesmos números, datas e definições usados em outros artigos do cluster; se um valor mudou, sinalize para atualizar os artigos irmãos.

## factCheckRules

1. Reprove qualquer número, data, valor, alíquota ou prazo sem fonte primária verificável e datada; 'especialistas dizem' ou fonte genérica = reprovação automática.
2. Reprove claims que contradigam consenso de fontes oficiais (Banco Central, Receita, INSS, IBGE) — em YMYL, uma imprecisão já justifica rating Lowest mesmo com o resto correto.
3. Verifique cada citação direta: a pessoa existe, tem a credencial declarada e disse aquilo em fonte rastreável; citação inventada ou não atribuível = reprovação e alerta grave.
4. Reprove contradições internas: valores/datas/definições que divergem de outros artigos já publicados no site — cross-check contra o corpus próprio, não só contra fontes externas.
5. Confira se todo link inline aponta para a fonte que realmente sustenta o claim (não para homepage genérica) e se a fonte é primária quando disponível.
6. Reprove dados desatualizados em temas de serviço: se existe versão mais recente do dado (nova tabela do IR, novo calendário INSS, Selic atual), o artigo não publica com o dado velho.
7. Valide metadados com o mesmo rigor do corpo: title, description, alt-text e structured data não podem afirmar nada que não esteja no texto visível — metadado alucinado é violação verificável.
8. Reprove afirmações de experiência não comprovada ('testamos', 'simulamos') sem evidência real da simulação/apuração nos registros do pipeline.
9. Verifique datePublished/dateModified: nunca data futura, dateModified só se houve mudança substantiva de conteúdo, data visível idêntica ao schema.
10. Reprove qualquer conteúdo que possa causar dano se errado (valor de benefício, prazo legal, regra tributária) quando a confiança na fonte for inferior a total — em YMYL não existe 'provavelmente correto'.

## seoRules

1. Title descritivo, factual, sem clickbait, com a entidade principal e o dado-chave quando couber ('Calendário INSS julho 2026: datas de pagamento por final de benefício'); reprove titles sensacionalistas.
2. Verifique resposta direta de 40-60 palavras após o H1 e após cada H2-pergunta — é a unidade de extração de featured snippet, AI Overview e fan-out.
3. Schema: NewsArticle para hard news, Article para guias/serviço (nunca BlogPosting); decisão por página. Propriedades obrigatórias: headline, image (1x1, 4x3 e 16x9), author (Person com name + url para página do autor), datePublished, dateModified. Não gaste tempo com description, keywords, articleBody ou subtipos granulares.
4. Structured data deve espelhar 100% o texto visível renderizado — valide programaticamente antes do publish; declarar o que não está no HTML é structured data spam.
5. Data visível 'Publicado em / Atualizado em' com hora e fuso, idêntica ao schema e ao lastmod do sitemap; minimize outras datas na página.
6. NÃO implemente HowTo schema nem espere FAQ rich results (ambos deprecados); FAQPage pode ficar como sinal semântico, ClaimReview sem expectativa de selo visual na SERP. Não implemente Speakable (beta, EUA/inglês apenas).
7. NÃO aplique nosnippet, data-nosnippet ou max-snippet restritivo em páginas que devem ser citadas por AI Overviews — esses controles matam a elegibilidade de citação.
8. Linkagem interna de cluster: todo artigo de notícia linka o guia-hub perene do tema e vice-versa; verifique que nenhum artigo fica órfão.
9. Author no schema com url apontando para página de autor real; adicione reviewedBy (Person com credencial) em artigos YMYL revisados.
10. Alt-text descritivo e factual em toda imagem; imagens grandes e de qualidade para Discover; imagens geradas por IA com metadado IPTC DigitalSourceType=TrainedAlgorithmicMedia.
11. Headings hierárquicos limpos (um H1, H2 por sub-pergunta, sem pular níveis); tabelas e listas em HTML semântico, nunca em imagem.
12. Confirme que o conteúdo principal está em HTML server-side renderizado — crawlers de IA (OAI-SearchBot, PerplexityBot, ClaudeBot) não renderizam JavaScript de forma confiável.
13. Meta description factual que resuma a resposta principal (útil para CTR, não para ranking); sem promessa que o texto não cumpre.
14. Não crie páginas fragmentadas 'para IA' (1 pergunta por URL, chunks artificiais) nem llms.txt como tática — Google confirmou que não usa; consolide profundidade por página.
15. URL curta, descritiva, com a entidade principal; canonical correto; breadcrumb com BreadcrumbList.

## humanizerRules

1. Preserve intocados: números, datas, valores, nomes, citações entre aspas, links e a resposta direta pós-heading — lapidação nunca altera fatos nem estrutura de extração.
2. Varie a estrutura entre artigos do site: quantidade e ordem de seções, tamanho de parágrafos, presença/ausência de tabela — templates idênticos em série são a assinatura visual de produção em massa que gera Lowest por suspeita.
3. Remova frases-molde de IA ('é importante ressaltar', 'no cenário atual', 'vale destacar que', 'em suma', 'além disso' em cadeia) e transições genéricas; substitua por conexões concretas do tema.
4. Corte hedging vazio ('pode variar dependendo de diversos fatores') — ou especifique quais fatores com dados, ou remova.
5. Elimine repetição de ideia com outras palavras (padding de LLM): cada parágrafo precisa acrescentar informação nova; se remover a frase não perde nada, remova.
6. Quebre simetrias artificiais: listas onde todo item tem exatamente o mesmo tamanho, seções todas com 3 parágrafos, tríades retóricas em série.
7. Adicione marcas de redação concreta quando o material existir: referência à apuração ('procuramos o INSS', 'na simulação que fizemos'), contexto local brasileiro, comparação com o mês anterior — nunca invente essas marcas.
8. Mantenha a primeira frase de cada seção como resposta direta; a lapidação atua da segunda frase em diante.
9. Não 'suavize' precisão: prefira 'R$ 1.518,00' a 'cerca de mil e quinhentos reais'; especificidade é sinal de qualidade, não de robotização.
10. Leia o texto final como um editor humano: se dois artigos do site sobre temas diferentes soam intercambiáveis, o trabalho não terminou.

## gateCriteria

1. Data visível == datePublished/dateModified do schema == lastmod do sitemap; nenhuma data futura; dateModified só muda se o diff de conteúdo for substantivo (ex.: >20% do texto ou mudança de dado numérico) — bloqueio automático caso contrário.
2. Structured data validado contra o HTML renderizado: toda propriedade declarada (headline, author, datas, claims) existe visível na página; divergência = bloqueio.
3. Mínimo de 2 links para fontes primárias oficiais (.gov.br ou órgão oficial) no corpo; todo número/valor/prazo tem fonte nomeada e datada a até 1 parágrafo de distância; violação = bloqueio.
4. Resposta direta de 40-60 palavras presente imediatamente após o H1; cada H2 em forma de pergunta tem resposta na primeira frase da seção.
5. Byline com autor real linkada a página de autor existente; artigos YMYL (finanças, benefícios, governo, eleições) exigem adicionalmente revisor humano nomeado com credencial e data da revisão visível — sem revisor, YMYL não publica.
6. Information gain mensurável: o artigo contém ao menos 1 elemento ausente das fontes usadas (tabela própria, cálculo, simulação datada, comparativo original); similaridade textual com qualquer fonte acima de limiar (ex.: >30% de overlap de n-gramas) = bloqueio.
7. Anti-template: similaridade estrutural (sequência de headings + distribuição de tamanhos de seção) com os últimos N artigos publicados abaixo de limiar definido; clones estruturais em série = bloqueio.
8. Cadência limitada pela capacidade de revisão humana: nenhum artigo publica sem aprovação humana registrada (nome + timestamp); volume diário tem teto vinculado ao número de revisores ativos, sem rajadas anômalas.
9. Nota de transparência de IA presente no rodapé, linkando a página /como-produzimos, com nome do editor humano responsável.
10. Consistência interna: números e definições do artigo batem com o índice canônico de fatos do site (Selic atual, teto INSS, faixas IR); conflito = bloqueio até reconciliação.
11. Checklist YMYL completo: autor + revisor + datas + fontes primárias + disclosure de IA + link para correções/contato — qualquer item ausente bloqueia publicação.
12. Página livre de nosnippet/max-snippet restritivo e de noindex acidental; conteúdo principal presente no HTML server-side (verificar com fetch sem JS).

## siteLevel

1. Crie as páginas institucionais de trust: /quem-somos (CNPJ, equipe, endereço, responsável editorial), /padroes-editoriais, /como-produzimos (pipeline de IA, fact-check, gates, revisão humana explicados), /correcoes (política operante com notas de correção datadas nos artigos) e /contato visível — requisitos binários de Google News/Top Stories.
2. Página de autor para cada jornalista/revisor com bio, credenciais verificáveis (CORECON, CFP, CNPI, OAB), foto real e sameAs para LinkedIn/Lattes; markup Person/ProfilePage; nome, foto e bio idênticos em todas as plataformas externas. Nunca personas fictícias.
3. NewsMediaOrganization no site com logo, sameAs, publishingPrinciples, correctionsPolicy e ownershipFundingInfo; Organization na homepage; BreadcrumbList em todas as páginas.
4. Organize conteúdo em clusters: guia-hub perene por tema (INSS, IR, Bolsa Família, Selic) + notícias do ciclo linkadas ao hub + sub-páginas de perguntas específicas, tudo interligado — autoridade tópica aumenta citação mesmo fora do top 10.
5. SSR obrigatório: todo conteúdo editorial no HTML inicial do servidor; audite que o front do Fato Nacional não depende de JS client-side para renderizar o texto (crítico dado o problema atual de o site mostrar seed data e não o CMS).
6. robots.txt: permita OAI-SearchBot, ChatGPT-User, Claude-SearchBot, PerplexityBot e Googlebot; verifique que Cloudflare/WAF não os bloqueia; decisão editorial separada para bots de treino (GPTBot, CCBot, Google-Extended — bloqueá-los não afeta AI Overviews).
7. Registre o site no Bing Webmaster Tools e garanta indexação no Bing — ChatGPT Search espelha o topo orgânico do Bing (87% de correspondência).
8. Sitemap de notícias + sitemap padrão com lastmod honesto; bloqueie por design qualquer atualização em massa de datas pelo CMS.
9. Programa de refresh agendado: guias de serviço (calendários, tabelas, taxas) revisados a cada 60-90 dias com atualização substantiva, changelog visível 'O que mudou' e revisor nomeado — decaimento de citação em IA começa em 2-3 meses.
10. Monitoramento segmentado no Search Console: Web, News, Discover e o relatório de recursos de IA generativa separadamente; trate share de citações em AI Overviews das queries-alvo como KPI, não só sessões.
11. Construa presença de entidade externa: especialistas do site comentando em outros veículos, participação genuína em comunidades brasileiras, canal YouTube com marca nos títulos/transcrições, digital PR — 85% das menções de marca em respostas de IA vêm de fontes terceiras.
12. Publicidade sob controle: conteúdo patrocinado claramente identificado, anúncios que não excedem o editorial, e proibição absoluta de seções de terceiros alugadas (cupons, cassinos, empréstimos) — site reputation abuse derruba portais inteiros.

## avoid

1. Publicar em massa saída de IA sem revisão substantiva: dos 220+ sites monitorados por Lily Ray, 54% perderam 30%+ do tráfego de pico e 22% perderam 75%+ — o padrão 'cresce 6-12 meses, colapsa' é a regra, não exceção.
2. Rajadas de URLs novas sem qualidade/engajamento proporcional: o sinal QualityCopiaFireflySiteSignal (leak do Google) mede razão URLs novas vs artigos de qualidade e good clicks em janelas de 30 dias — salto de 10 para milhares de páginas/mês é assinatura de scaled abuse.
3. Parafrasear/costurar conteúdo de outras páginas sem valor agregado: é exemplo literal de scaled content abuse e de rating Lowest nas QRG; nas deindexações de março/2024, sites com 90-100% de posts IA sem originalidade receberam manual action Pure Spam.
4. 'SEO heist' (copiar sitemap/pautas de concorrente e gerar versões IA): caso Causal/Exceljet — ganho temporário, colapso posterior e erros factuais propagados até featured snippets.
5. Os 8 templates de colapso: comparações A-vs-B em massa, glossários 1-termo-por-URL, listicles 'melhor X' genéricos, páginas vs-cada-concorrente, scaling programático de localidade com conteúdo mínimo, FAQ farms, listicles autopromocionais e conteúdo off-topic em escala.
6. Autores fictícios, personas de IA com foto/bio falsas ou byline enganosa: 'deceptive purpose' = Lowest automático, e destrói a defesa do site sob investigação de rater ou concorrente — em YMYL financeiro, investigam.
7. Data-bumping: atualizar dateModified ou trocar data de publicação sem mudança real; o Google mantém histórico de crawl próprio e o leak mostra detecção de discrepância byline vs first-seen.
8. Alugar a reputação do domínio para conteúdo de terceiros (cupons, cassinos, reviews de empréstimo): site reputation abuse é punido independentemente de supervisão first-party e derrubou seções de grandes portais.
9. Esconder a escala criando múltiplos sites paralelos para diluir volume — listado nominalmente como violação na política de spam.
10. Templates visualmente idênticos + cadência de máquina + autores genéricos: as QRG 4.6.5 mandam raters dar Lowest por mera SUSPEITA de produção em massa, sem prova do método.
11. Gastar engenharia em hacks de 'GEO/AEO': llms.txt (Google não usa; 97% dos arquivos nunca são lidos), chunks 'para máquinas', schema especial de IA, keyword stuffing (efeito nulo/negativo) — o guia oficial de mai/2026 desmente todos.
12. Reagir a core update deletando seções em pânico: o Google diz que deletar é último recurso e que a vontade de apagar seções inteiras indica que foram feitas para buscadores; diagnóstico correto = esperar fim do rollout, comparar semanas no Search Console, avaliar contra as perguntas de autoavaliação.