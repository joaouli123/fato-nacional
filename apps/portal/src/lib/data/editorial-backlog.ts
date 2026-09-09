// Fila de pautas para a automação diária (cron /api/cron/daily-publish).
// O cron pega as próximas que ainda NÃO existem (slug não publicado), respeitando
// a grade, gera com o portão de qualidade e publica no banco. Reabastecer quando
// restar pouco. Slugs sem acento (é URL); todo o resto acentuado.
export type BacklogItem = {
  slug: string;
  title: string;
  category: string; // slug da categoria
  author: string; // nome da mesa
  type: string;
  primaryKeyword: string;
  words: string;
  ymyl: boolean; // finanças/saúde/direito/política/segurança → barra 92
  angle: string;
  mustCover: string[];
  interlinks: Array<{ slug: string; anchor: string }>;
};

export const editorialBacklog: BacklogItem[] = [
  // ---- Variedade (preenche as categorias novas primeiro) ----
  {
    slug: "playstation-xbox-nintendo-switch-qual-console-escolher",
    title: "PlayStation, Xbox ou Nintendo Switch: qual console escolher",
    category: "games", author: "Mesa de Cultura", type: "comparativo", words: "1300 a 1800",
    ymyl: false, primaryKeyword: "qual console escolher",
    angle: "Comparar as três plataformas (PlayStation, Xbox, Nintendo Switch) para quem vai comprar: proposta, exclusivos, serviços de assinatura, desempenho x portabilidade, preço e para qual perfil cada uma serve. Sem torcida.",
    mustCover: ["a proposta de cada console", "exclusivos e catálogo", "assinaturas (PS Plus, Game Pass, Nintendo Online)", "desempenho x portabilidade", "faixa de preço", "para qual perfil serve", "tabela comparativa dos três"],
    interlinks: [{ slug: "o-que-e-esports-como-se-tornou-profissao", anchor: "o que são os eSports" }],
  },
  {
    slug: "streamings-netflix-prime-disney-max-comparativo",
    title: "Netflix, Prime Video, Disney+ ou Max: qual streaming vale mais a pena",
    category: "entretenimento", author: "Mesa de Cultura", type: "comparativo", words: "1300 a 1800",
    ymyl: false, primaryKeyword: "qual streaming vale a pena",
    angle: "Comparar os principais streamings de vídeo no Brasil: foco de catálogo, planos e faixas de preço (que mudam), planos com/sem anúncios, qualidade de imagem, telas simultâneas e como escolher/alternar. Orientar a confirmar preço no site oficial.",
    mustCover: ["foco de catálogo de cada plataforma", "planos e faixas de preço (avisar que mudam)", "com anúncios x sem anúncios", "qualidade de imagem e telas", "estratégia de assinar e alternar", "tabela comparativa"],
    interlinks: [{ slug: "playstation-xbox-nintendo-switch-qual-console-escolher", anchor: "qual console de videogame escolher" }],
  },
  {
    slug: "o-que-e-var-como-funciona-futebol",
    title: "O que é o VAR e como funciona no futebol",
    category: "esportes", author: "Mesa de Esportes", type: "explicador", words: "1100 a 1500",
    ymyl: false, primaryKeyword: "o que é o VAR",
    angle: "Explicar o árbitro de vídeo: o que é, as 4 situações em que pode ser acionado, o procedimento de revisão, quem decide e as críticas comuns. Didático.",
    mustCover: ["o que é o VAR e por que foi criado", "as 4 situações revisáveis", "o procedimento de revisão", "quem decide no fim", "críticas e limites", "tabela de situações revisáveis x não revisáveis"],
    interlinks: [{ slug: "como-funcionam-jogos-olimpicos-modalidades-medalhas", anchor: "como funcionam os Jogos Olímpicos" }],
  },
  {
    slug: "o-que-e-esports-como-se-tornou-profissao",
    title: "O que são os eSports e como viraram profissão",
    category: "games", author: "Mesa de Cultura", type: "explicador", words: "1200 a 1600",
    ymyl: false, primaryKeyword: "o que são eSports",
    angle: "Explicar os esportes eletrônicos: o que são, jogos competitivos, times/ligas/campeonatos, como virar profissional, formas de ganhar dinheiro e tamanho do mercado. Sem hype.",
    mustCover: ["o que são eSports e principais jogos", "times, ligas e campeonatos", "como virar profissional", "monetização (salário, premiação, patrocínio, streaming)", "papel do streaming", "tabela de carreiras no ecossistema"],
    interlinks: [{ slug: "playstation-xbox-nintendo-switch-qual-console-escolher", anchor: "qual console escolher" }],
  },
  {
    slug: "como-funcionam-jogos-olimpicos-modalidades-medalhas",
    title: "Como funcionam os Jogos Olímpicos: modalidades, medalhas e sedes",
    category: "esportes", author: "Mesa de Esportes", type: "guia", words: "1400 a 2000",
    ymyl: false, primaryKeyword: "como funcionam os Jogos Olímpicos",
    angle: "Guia sobre os Jogos Olímpicos: o que são e origem, o COI, escolha da cidade-sede, ciclo de 4 anos, Olimpíadas x Paralimpíadas, modalidades e quadro de medalhas. Evergreen, sem inventar números.",
    mustCover: ["o que são e a origem", "o COI e a escolha da sede", "ciclo de 4 anos e Verão x Inverno", "Olimpíadas x Paralimpíadas", "modalidades e quadro de medalhas", "tabela comparativa"],
    interlinks: [{ slug: "o-que-e-var-como-funciona-futebol", anchor: "o que é o VAR no futebol" }],
  },
  // ---- Finanças / serviços (evergreen fortes) ----
  {
    slug: "o-que-e-cet-custo-efetivo-total-como-comparar",
    title: "O que é o CET (Custo Efetivo Total) e como comparar empréstimos",
    category: "financas", author: "Mesa de Economia", type: "explicador", words: "1100 a 1500",
    ymyl: true, primaryKeyword: "o que é CET",
    angle: "Explicar o Custo Efetivo Total: o que é, por que ele (e não só a taxa de juros) mostra o custo real do crédito, o que entra no CET (juros, IOF, tarifas, seguros) e como usar para comparar propostas. Com disclaimer.",
    mustCover: ["o que é o CET e por que existe", "diferença entre taxa de juros e CET", "o que compõe o CET (juros, IOF, tarifas, seguros)", "como comparar propostas pelo CET", "onde encontrar o CET", "tabela de exemplo"],
    interlinks: [{ slug: "rotativo-do-cartao-o-que-e-como-sair", anchor: "o rotativo do cartão" }],
  },
  {
    slug: "reserva-de-emergencia-quanto-guardar-onde-deixar",
    title: "Reserva de emergência: quanto guardar e onde deixar",
    category: "financas", author: "Mesa de Economia", type: "guia", words: "1300 a 1800",
    ymyl: true, primaryKeyword: "reserva de emergência",
    angle: "Guia da reserva de emergência: o que é, quanto guardar (3 a 6 meses de despesas), onde deixar (liquidez diária e baixo risco), erros comuns e como montar aos poucos. Sem recomendação individual.",
    mustCover: ["o que é e para que serve", "quanto guardar (3 a 6 meses)", "onde deixar (liquidez diária, baixo risco)", "o que evitar (deixar sem liquidez)", "passo a passo para montar", "tabela de onde guardar"],
    interlinks: [{ slug: "guia-renda-fixa-iniciantes-2026", anchor: "guia de renda fixa para iniciantes" }],
  },
  {
    slug: "salario-minimo-2026-valor-reajuste-o-que-indexa",
    title: "Salário mínimo 2026: valor, reajuste e o que ele indexa",
    category: "brasil", author: "Mesa de Economia", type: "explicador", words: "1000 a 1400",
    ymyl: false, primaryKeyword: "salário mínimo 2026",
    angle: "Explicar o salário mínimo: como é definido o reajuste, o que ele corrige (benefícios do INSS, seguro-desemprego, etc.) e o impacto na economia. Orientar a confirmar o valor vigente na fonte oficial (sem inventar número).",
    mustCover: ["como o reajuste do mínimo é definido", "o que o mínimo indexa (INSS, benefícios)", "impacto na economia e no consumo", "onde confirmar o valor vigente", "tabela do que é atrelado ao mínimo"],
    interlinks: [{ slug: "como-funciona-fgts-saldo-saques-modalidades", anchor: "como funciona o FGTS" }],
  },
  {
    slug: "como-funciona-fgts-saldo-saques-modalidades",
    title: "Como funciona o FGTS: saldo, saques e modalidades",
    category: "brasil", author: "Mesa de Economia", type: "serviço", words: "1200 a 1600",
    ymyl: false, primaryKeyword: "como funciona o FGTS",
    angle: "Explicar o FGTS: o que é, como o saldo é formado, quando pode sacar (demissão, saque-aniversário, moradia, etc.), como consultar o saldo e cuidados. Serviço prático.",
    mustCover: ["o que é o FGTS e quem tem", "como o saldo é formado", "situações de saque (demissão, saque-aniversário, moradia)", "como consultar o saldo (app FGTS)", "saque-rescisão x saque-aniversário", "tabela das modalidades de saque"],
    interlinks: [{ slug: "salario-minimo-2026-valor-reajuste-o-que-indexa", anchor: "o salário mínimo" }],
  },
  {
    slug: "golpes-digitais-mais-comuns-como-se-proteger",
    title: "Golpes digitais mais comuns e como se proteger",
    category: "tecnologia-e-ia", author: "Mesa de Tecnologia", type: "guia", words: "1300 a 1800",
    ymyl: false, primaryKeyword: "golpes digitais como se proteger",
    angle: "Guia dos golpes digitais mais comuns no Brasil (phishing, falso funcionário de banco, Pix errado, clonagem de WhatsApp, falsa central) e o passo a passo para se proteger e o que fazer se cair. Prático.",
    mustCover: ["principais golpes (phishing, falso banco, WhatsApp clonado, Pix)", "sinais de alerta", "como se proteger (2FA, desconfiar de links, confirmar canais)", "o que fazer se cair no golpe", "onde denunciar", "tabela golpe x como identificar"],
    interlinks: [{ slug: "pix-automatico-e-seguro-golpes-como-se-proteger", anchor: "golpes no Pix e como evitar" }],
  },
];
