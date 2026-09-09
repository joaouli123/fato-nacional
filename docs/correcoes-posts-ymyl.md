# Correções obrigatórias — posts YMYL despublicados (2026-07-10)

Ambos os posts foram **despublicados** (status: rascunho / revisão humana) após verificação factual multi-agente contra fontes oficiais (CAIXA, SUSEP, Planalto, BCB). Só republicar após aplicar as correções abaixo E aprovação de um revisor humano (admin/reviewer) no /cms.

---

## 1. financiamento-imovel-sac-ou-price-como-funciona-qual-escolher (id 38)

### Erros críticos confirmados

1. O artigo vende a Tabela Price como 'parcelas fixas desde o primeiro mês' com 'previsibilidade absoluta' e omite completamente TR, IPCA e correção monetária do saldo devedor. Nos financiamentos habitacionais brasileiros típicos (contratos indexados a TR ou IPCA, sendo TR 'a modalidade mais tradicional do mercado' segundo a própria CAIXA), o saldo devedor é atualizado mensalmente e a prestação varia mesmo na Price — só contratos prefixados têm parcela realmente fixa. Erro material que pode induzir o leitor a escolher a Price esperando parcela imutável por 30 anos.

2. Erro factual sobre seguros habitacionais (claim c8): o artigo afirma que MIP e DFI 'batem sobre o saldo devedor'. Falso para o DFI — o prêmio do DFI incide sobre o valor de avaliação do imóvel (valor da garantia) e independe do sistema de amortização; apenas o MIP acompanha o saldo devedor (e a idade do mutuário). Confirmado pelo FAQ oficial da CAIXA.

3. As 3 'Fontes consultadas' são quebradas ou inexistentes (aparentam URLs alucinadas por IA): (1) Caixa '/voce/habitacao/financiamento-imoveis/...' — 404, slug correto é 'financiamento-de-imoveis'; (2) BCB '/estabilidadefinanceira/credito-imobiliario' — soft-404, rota inexistente confirmada pela API de conteúdo do BCB; (3) gov.br '/cidades/pt-br/acesso-a-informacao/mcmv/mcmv-novo' — HTTP 404. Nenhuma alegação do artigo tem respaldo verificável.

4. Evidências fabricadas/inverificáveis: 'estudo de mercado de junho de 2024' sem nome, autor ou link; 'simulações realizadas em maio de 2024' sem um único número, taxa, prazo ou tabela em todo o texto; '85% a 90% do que pagou foi só juros' sem premissas nem fonte.

5. Anacronismo com alegação de mercado sem fonte: artigo publicado em 07/07/2026 afirma no presente que 'O SAC é, em outubro de 2024, o queridinho dos financiamentos imobiliários no Brasil' — data 21 meses anterior à publicação, sem nenhum dado ABECIP/BCB. Padrão de datas de preenchimento de IA não revisadas.

6. Link interno quebrado no corpo do artigo: âncora 'estratégia de renda passiva' aponta para /artigos/bens-investimentos-ou-renda-passiva, que retorna HTTP 404.

### Correções exatas (com redação sugerida e fonte)

1. Reescrever a seção da Price removendo 'parcelas fixas desde o primeiro mês' e 'previsibilidade absoluta'. Redação sugerida: 'Na Tabela Price, o encargo mensal é calculado para ser constante, mas na prática dos financiamentos habitacionais brasileiros a parcela só é realmente fixa nos contratos com taxa prefixada. Nos contratos indexados à TR — a modalidade mais tradicional do mercado — ou ao IPCA, o saldo devedor é atualizado mensalmente pelo indexador e a prestação é recalculada, podendo subir mesmo na Price.' Fontes oficiais: https://www.caixa.gov.br/voce/habitacao/perguntas-frequentes-novos-financiamentos/Paginas/default.aspx e https://www.caixa.gov.br/voce/habitacao/financiamento-de-imoveis/Paginas/default.aspx; base normativa do IPCA no SFH: Resolução CMN 4.676/2018 (https://normativos.bcb.gov.br/Lists/Normativos/Attachments/50628/Res_4676_v8_P.pdf).

2. Corrigir o trecho sobre seguros (c8). Redação sugerida: 'O MIP (Morte e Invalidez Permanente) incide sobre o saldo devedor e sobre a idade do mutuário — por isso decresce mais rápido no SAC. Já o DFI (Danos Físicos ao Imóvel) é calculado sobre o valor de avaliação do imóvel, não sobre o saldo devedor, e não depende do sistema de amortização escolhido.' Fonte: FAQ oficial da CAIXA (https://www.caixa.gov.br/voce/habitacao/perguntas-frequentes-novos-financiamentos/Paginas/default.aspx).

3. Substituir o link quebrado da Caixa pela URL correta e existente: https://www.caixa.gov.br/voce/habitacao/financiamento-de-imoveis/Paginas/default.aspx (a URL do artigo, com slug 'financiamento-imoveis' sem 'de', retorna 404).

4. Substituir o link inexistente do BCB (bcb.gov.br/estabilidadefinanceira/credito-imobiliario, soft-404) por uma fonte real e verificada antes da republicação — por exemplo, a Resolução CMN 4.676/2018, que disciplina o crédito imobiliário e a indexação por IPCA: https://normativos.bcb.gov.br/Lists/Normativos/Attachments/50628/Res_4676_v8_P.pdf. Não republicar com URL do BCB sem teste HTTP + verificação de conteúdo renderizado.

5. Substituir o link 404 do MCMV pela seção real do programa: https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/habitacao/programa-minha-casa-minha-vida (o caminho 'acesso-a-informacao/mcmv/mcmv-novo' não existe).

6. Remover 'Um estudo de mercado de junho de 2024 mostrou que...' (c3). Como a superioridade do SAC em juros totais é propriedade matemática dos sistemas, reescrever sem apelo a estudo inexistente: 'Para a mesma taxa e o mesmo prazo, o total de juros pago no SAC é matematicamente inferior ao da Price, porque o saldo devedor cai mais rápido desde as primeiras parcelas.' Alternativamente, citar e linkar um estudo real e nomeado (ex.: dados ABECIP ou BCB) — nunca 'estudo de mercado' genérico.

7. Remover 'Simulações realizadas em maio de 2024 ilustram bem essa dinâmica' (c2) ou incluir uma simulação numérica real com premissas explícitas (valor financiado, taxa, prazo, valor das primeiras e últimas parcelas em SAC e Price). Referência de formato: a própria CAIXA publica simulação com R$ 148.000,00 em 420 meses comparando TR, IPCA e taxa fixa em https://www.caixa.gov.br/voce/habitacao/financiamento-de-imoveis/Paginas/default.aspx.

8. Remover 'O SAC é, em outubro de 2024, o queridinho dos financiamentos imobiliários no Brasil' (c4). Ou eliminar a alegação de predominância de mercado, ou sustentá-la com dado atual e citado (estatísticas ABECIP/BCB com link e data de acesso), sem datas anacrônicas em relação à publicação de 07/07/2026.

9. Qualificar o percentual de juros da Price (c5) com premissas explícitas. Redação sugerida: 'Em um financiamento típico de 30 a 35 anos com taxa em torno de 10% ao ano, cerca de 90% do valor das primeiras parcelas da Price corresponde a juros — o percentual varia conforme taxa e prazo.' Remover a data fabricada 'extrato em maio de 2026'.

10. Contextualizar o cálculo de economia (c6): informar o valor financiado de referência, ex.: 'Em um financiamento de R$ 300 mil por 30 anos, uma redução de 0,5 ponto percentual ao ano na taxa pode representar dezenas de milhares de reais de economia total.'

11. Citar a base legal da quitação antecipada (c7). Redação sugerida: 'O Código de Defesa do Consumidor (Lei 8.078/1990, art. 52, §2º) garante a redução proporcional dos juros e demais acréscimos na liquidação antecipada do débito.' Link: https://www.planalto.gov.br/ccivil_03/leis/l8078.htm.

12. Corrigir o link interno quebrado: remover a âncora 'estratégia de renda passiva' ou apontá-la para um artigo existente do site (o slug /artigos/bens-investimentos-ou-renda-passiva retorna 404; os demais links internos respondem 200).

13. Antes de republicar: revisão humana completa com verificação HTTP de todos os links (internos e externos), remoção de todas as datas de preenchimento (maio/2024, junho/2024, outubro/2024, maio/2026) e, recomendado, referenciar o material oficial vigente da CAIXA sobre o tema: 'SAC ou Price: entenda as diferenças' (CAIXA Notícias, fev/2026) — https://caixanoticias.caixa.gov.br/Paginas/Not%C3%ADcias/2026/02-FEVEREIRO/SAC-ou-Price-entenda-as-diferen%C3%A7as-entre-os-sistemas-de-amortiza%C3%A7%C3%A3o-e-fa%C3%A7a-a-melhor-escolha.aspx.

---

## 2. seguro-de-vida-como-funciona-coberturas-valor-vale-a-pena (id 37)

### Correções exatas (com redação sugerida e fonte)

1. Portabilidade — reescrever a seção 'Portabilidade e resgate parcial'. Redação sugerida: 'A portabilidade regulada pela Susep vale apenas para planos com cobertura por sobrevivência (como VGBL), consiste na transferência da reserva acumulada entre seguradoras e exige carência mínima de 60 dias entre portabilidades. Seguro de vida de risco (cobertura por morte/invalidez) não tem portabilidade: trocar de seguradora significa contratar nova apólice, com novas condições e novas carências.' Fonte: https://www.gov.br/susep/pt-br/assuntos/meu-futuro-seguro/seguros-previdencia-e-capitalizacao/seguros/seguro-vgbl-vrgp-vagp-vrsa-vri-dotal/duvidas-especificas

2. Beneficiário não indicado — substituir a frase 'o montante cai no inventário e pode ser tributado' por: 'Se não houver beneficiário indicado, a seguradora paga metade do capital ao cônjuge ou companheiro e o restante aos demais herdeiros, diretamente e sem necessidade de inventário (art. 115 da Lei 15.040/2024). O capital segurado por morte não é considerado herança para nenhum efeito (art. 116).' Fonte: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/L15040.htm

3. ITCMD — substituir 'na maioria dos estados brasileiros existe isenção do ITCMD... só vale se houver indicação expressa do beneficiário' por: 'Por norma geral nacional, o ITCMD não incide sobre benefícios pagos por contratos de seguro em nenhum estado (LC 227/2026, art. 150, III), e o capital de seguro de vida não integra a herança (Lei 15.040/2024, art. 116).' Fonte: https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp227.htm

4. Taxonomia de produtos — remover 'capitalização (conhecida como VGBL ou PGBL de sobrevivência)' e substituir por: 'VGBL é um seguro de pessoas com cobertura por sobrevivência (Resolução CNSP 464/2024); PGBL é um plano de previdência complementar aberta (Resolução CNSP 463/2024); título de capitalização é um terceiro produto, distinto de ambos.' Fonte: https://www.gov.br/susep/pt-br/assuntos/meu-futuro-seguro

5. CET — remover a recomendação de 'rodar a ferramenta de custo efetivo total (CET)' e o link interno de crédito. Redação sugerida: 'Para comparar apólices, avalie prêmio mensal, capital segurado, coberturas incluídas, franquias e carências nas Condições Gerais do produto, que devem estar registradas na Susep (o CET é um indicador exclusivo de operações de crédito e não se aplica a seguros — Resolução CMN 3.517/2007).' Fonte: https://www.bcb.gov.br/pre/normativos/res/2007/pdf/res_3517_v1_o.pdf

6. Prazo de sinistro — substituir 'Segundo as regras da Susep, em janeiro de 2026... o prazo médio de pagamento gira em torno de 30 dias' por: 'Entregue toda a documentação exigida, a seguradora tem prazo máximo de 30 dias corridos para liquidar o sinistro (Circular Susep 621/2021, art. 43); o prazo fica suspenso se forem solicitados documentos complementares.' Fonte: https://www2.susep.gov.br/safe/scripts/bnweb/bnmapi.exe?router=upload/29461

7. Base legal — revisar todas as menções a 'a lei' e ao Decreto-Lei 73/1966: citar a Lei 15.040/2024 (Marco Legal dos Seguros, vigente desde dez/2025) como fonte das regras contratuais (beneficiários, herança, carências); manter o DL 73/1966 apenas como base do Sistema Nacional de Seguros Privados e da competência da Susep. Fontes: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/L15040.htm e http://www.planalto.gov.br/ccivil_03/decreto-lei/del0073.htm

8. Seção 'Fontes consultadas' — remover o link 404 da Susep ('Manual de Orientação Seguros de Pessoas') e a página inexistente do Banco Central ('Mercado de Seguros e Previdência'); substituir por: Lei 15.040/2024 (Planalto), LC 227/2026 art. 150 (Planalto), Circular Susep 621/2021 e o portal Meu Futuro Seguro da Susep (https://www.gov.br/susep/pt-br/assuntos/meu-futuro-seguro). Nunca atribuir regulação de seguros ao Banco Central — a supervisão é da Susep/CNSP.

9. Dimensionamento da cobertura — substituir 'a soma segurada deve ser equivalente a 12 vezes a sua renda anual' por: 'Não existe regra oficial da Susep para o valor da cobertura; corretores costumam sugerir capital entre 5 e 10 vezes a renda anual, ajustado a dívidas, número de dependentes e anos de proteção desejados.' Apresentar explicitamente como heurística de mercado, sem atribuição regulatória.

10. Marcadores temporais — remover todas as ocorrências de 'janeiro de 2026' e '(janeiro de 2026)' (artigo publicado em 06/07/2026) e substituir por 'em 2026' ou remover; revisar o template/prompt de geração que congelou a data 6 meses antes da publicação.

11. Link do Planalto — trocar http://www.planalto.gov.br/... por URL https funcional ou verificar acessibilidade em navegadores com HTTPS-First antes de republicar.

---

*Gerado pelo workflow verify-ymyl-posts (wf_45a94af2-6fa), 10 agentes, verificação em fontes oficiais.*
