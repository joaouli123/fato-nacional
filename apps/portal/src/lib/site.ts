export const siteConfig = {
  name: "Fato Nacional",
  description:
    "Fato Nacional — notícias do Brasil e do mundo: economia, tecnologia, política e cidadania, com apuração cuidadosa e linguagem clara.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://fatonacional.com",
  email: "contato@fatonacional.com",
  nav: [
    { href: "/", label: "Início" },
    { href: "/categoria/brasil", label: "Brasil" },
    { href: "/categoria/tecnologia-e-ia", label: "Tecnologia e IA" },
    { href: "/autores", label: "Autores" },
  ],
};
