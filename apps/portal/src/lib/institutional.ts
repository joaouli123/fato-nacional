export type InstitutionalPageData = {
  title: string;
  description: string;
  body: string[];
};

export const institutionalPages: Record<string, InstitutionalPageData> = {
  "quem-somos": {
    title: "Quem somos",
    description:
      "Conheça o Fato Nacional: jornalismo independente com apuração cuidadosa, fontes verificadas e linguagem clara sobre o Brasil e o mundo.",
    body: [
      "O Fato Nacional é um portal de notícias independente dedicado a explicar o que importa para o leitor brasileiro — economia, tecnologia, política, mundo e cidadania — com apuração cuidadosa e linguagem direta.",
      "Nossa missão é transformar assuntos complexos em informação útil e confiável, sem sensacionalismo. Cada matéria busca contexto, dados de fontes oficiais e o impacto prático na vida das pessoas.",
      "Trabalhamos com checagem de fatos, citação de fontes primárias e separação clara entre notícia, análise e opinião. Quando erramos, corrigimos de forma transparente.",
      "Acreditamos que bom jornalismo é aquele que respeita o tempo e a inteligência de quem lê.",
    ],
  },
  equipe: {
    title: "Equipe e redação",
    description:
      "Conheça as mesas de cobertura, os critérios editoriais e como o Fato Nacional registra automação e revisão humana.",
    body: [
      "A produção do Fato Nacional é organizada em mesas editoriais responsáveis por temas e critérios de cobertura. Ferramentas de inteligência artificial apoiam pesquisa, estrutura, redação e verificações técnicas.",
      "Todo conteúdo público passa por gates e checagens automatizadas. Quando há revisão humana, o artigo identifica o revisor, a data e a versão analisada; sem esse registro, a página informa expressamente que não há revisão humana verificável. Conteúdos sensíveis ficam fora do portal até receberem aprovação humana vinculada à versão.",
      "Sugestões de pauta e contato com a redação podem ser enviados para contato@fatonacional.com.",
    ],
  },
  contato: {
    title: "Contato",
    description:
      "Fale com o Fato Nacional: sugestões de pauta, correções, parcerias e pedidos institucionais pelo e-mail contato@fatonacional.com.",
    body: [
      "Quer enviar uma sugestão de pauta, apontar uma correção ou falar sobre parcerias? Estamos à disposição.",
      "E-mail: contato@fatonacional.com",
      "Para pedidos de correção, descreva a matéria e o trecho em questão — levamos cada apontamento a sério e respondemos o quanto antes.",
    ],
  },
  privacidade: {
    title: "Política de privacidade",
    description: "Como o Fato Nacional coleta, usa e protege seus dados, em conformidade com a LGPD.",
    body: [
      "O Fato Nacional respeita a sua privacidade e coleta apenas os dados necessários para operar o site, garantir segurança e melhorar a experiência editorial.",
      "Utilizamos ferramentas de análise (como o Google Analytics) para entender, de forma agregada e anônima, como as páginas são acessadas. Esses dados não são usados para identificar você individualmente.",
      "Ao se inscrever na nossa newsletter, você nos fornece nome e e-mail, usados exclusivamente para o envio do conteúdo. Você pode pedir a remoção a qualquer momento pelo e-mail contato@fatonacional.com.",
      "Tratamos os dados pessoais de acordo com a Lei Geral de Proteção de Dados (LGPD).",
    ],
  },
  termos: {
    title: "Termos de uso",
    description: "Termos e condições de uso do conteúdo publicado no Fato Nacional.",
    body: [
      "O conteúdo publicado no Fato Nacional tem caráter informativo e pode ser atualizado sempre que novas informações de fontes oficiais estiverem disponíveis.",
      "A reprodução de textos depende de autorização e deve sempre citar a fonte, com link para a matéria original.",
      "O Fato Nacional não se responsabiliza por decisões tomadas exclusivamente com base em informações do site — recomendamos sempre consultar fontes oficiais para assuntos como saúde, finanças e direitos.",
    ],
  },
  "politica-editorial": {
    title: "Política editorial",
    description: "Os princípios que guiam a apuração, a checagem e a publicação no Fato Nacional.",
    body: [
      "A linha editorial do Fato Nacional prioriza fontes primárias, transparência metodológica e separação clara entre notícia, análise e opinião.",
      "Buscamos ouvir os lados envolvidos, contextualizar dados e evitar manchetes que distorçam o conteúdo da matéria.",
      "Os conteúdos passam por edição assistida, validações técnicas e gates automatizados. Temas sensíveis só ficam publicamente disponíveis após revisão humana identificada e vinculada por hash à versão aprovada.",
      "Independência editorial é inegociável: o conteúdo jornalístico não é influenciado por anunciantes ou interesses comerciais.",
    ],
  },
  "politica-de-correcoes": {
    title: "Política de correções",
    description:
      "Como o Fato Nacional corrige erros de forma transparente e registra alterações relevantes.",
    body: [
      "Erros confirmados são corrigidos o mais rápido possível. Quando a alteração muda a compreensão do texto, registramos a correção de forma transparente ao final da matéria.",
      "Para solicitar uma correção, escreva para contato@fatonacional.com indicando a matéria e o trecho.",
      "Distinguimos correções (erros de fato) de atualizações (novas informações sobre um fato em andamento), sinalizando ambas ao leitor.",
    ],
  },
  expediente: {
    title: "Expediente",
    description:
      "Expediente do Fato Nacional: responsabilidade editorial, mesas de cobertura, contatos institucionais e princípios de transparência.",
    body: [
      "O Fato Nacional é um veículo de jornalismo independente em português do Brasil, dedicado a explicar economia, tecnologia, política, mundo e cidadania com apuração cuidadosa, fontes oficiais e linguagem clara.",
      "Responsabilidade editorial: a direção de conteúdo responde pela linha editorial e pelos critérios de publicação. O pipeline executa checagens automatizadas; conteúdos sensíveis (economia, saúde, direito, política e segurança) ficam em quarentena pública até terem revisor, data e hash da versão aprovados no CMS.",
      "Mesas de cobertura: a produção é organizada em mesas editoriais — Mesa de Economia, Mesa de Tecnologia, Mesa Internacional e Redação Fato Nacional —, cada uma com escopo, fontes habituais e critérios próprios descritos nas páginas de autores.",
      "Contato editorial e sugestões de pauta: contato@fatonacional.com.",
      "Correções: descreva a matéria e o trecho em contato@fatonacional.com. Erros confirmados são corrigidos de forma transparente, conforme a nossa política de correções.",
      "Anúncios e parcerias: contato@fatonacional.com.",
      "Transparência: indicamos datas editoriais, fontes e o uso de inteligência artificial. Revisão humana só é declarada quando há um registro nominal e vinculado à versão exibida; caso contrário, essa ausência aparece no próprio artigo. Consulte também a nossa política editorial e a página “Como usamos IA”.",
      "Última atualização desta página: 30 de junho de 2026.",
    ],
  },
  "como-usamos-ia": {
    title: "Como usamos IA",
    description:
      "Como o Fato Nacional usa inteligência artificial na redação, executa checagens automatizadas e registra revisão humana quando ela ocorre.",
    body: [
      "O Fato Nacional usa ferramentas de inteligência artificial no levantamento de pautas, na organização de pesquisa, na estruturação de rascunhos, na edição e na otimização para busca.",
      "Conteúdos de menor risco podem ser publicados depois de gates e checagens automatizadas. Temas sensíveis — como finanças, saúde, direito, política e segurança — ficam fora do portal público enquanto não houver revisão humana registrada para a versão exata do texto.",
      "As verificações automáticas analisam estrutura, links, fontes, consistência e requisitos editoriais. Elas não são apresentadas ao leitor como revisão humana. Quando uma pessoa revisa o conteúdo, o CMS registra revisor, data e hash da versão aprovada.",
      "Fluxo editorial: detecção de oportunidade → pesquisa → rascunho assistido por IA → checagem factual e técnica → gates de qualidade → revisão humana quando exigida → publicação → monitoramento e atualização.",
      "Transparência: cada artigo informa se a versão exibida possui revisão humana verificável. Também indicamos datas editoriais, créditos de imagem e mantemos uma política pública de correções.",
      "Dúvidas ou correções: contato@fatonacional.com.",
    ],
  },
};
