/**
 * AI image generation via OpenAI (api.openai.com) — SEPARATE from text generation
 * (which uses OpenCode Zen via OPENAI_API_KEY/OPENAI_BASE_URL). Uses its own key
 * OPENAI_IMAGE_API_KEY so the two never collide.
 */
const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";

export type GeneratedImage = {
  base64: string;
  revisedPrompt?: string;
  usage?: { inputTokens: number; outputTokens: number };
};

export function imagePromptFor(headline: string, category: string): string {
  // Brand visual identity for the Fato Nacional (premium, conceptual, no faces,
  // no text), so AI covers fit explanatory/evergreen topics without looking like
  // generic stock or a fake "photo of a real event".
  return [
    `Capa editorial conceitual para o portal de notícias "Fato Nacional" sobre o tema: "${headline}".`,
    `Categoria editorial: ${category}.`,
    "Estilo: jornalístico premium e minimalista, ILUSTRAÇÃO conceitual (não é foto de um evento real).",
    "Paleta predominante em preto, branco e tons de cinza, com pequenos detalhes em vermelho ou azul.",
    "Fundo editorial limpo e elegante. SEM rostos de pessoas, SEM texto, letras, números, logotipos ou marcas d'água.",
    "Composição limpa, iluminação suave, alta qualidade. Proporção paisagem 16:9.",
  ].join(" ");
}

/** Returns a base64 PNG (no data: prefix) or null if not configured / on error. */
export async function generateArticleImage(
  prompt: string,
  opts?: { size?: string },
): Promise<GeneratedImage | null> {
  const key = process.env.OPENAI_IMAGE_API_KEY;
  if (!key) return null;
  const res = await fetch(OPENAI_IMAGE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
        prompt,
        size: opts?.size || "1536x1024",
        n: 1,
      }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 220)}`);
  }
  const json = (await res.json()) as {
    data?: Array<{ b64_json?: string; revised_prompt?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const item = json.data?.[0];
  if (!item?.b64_json) throw new Error("OpenAI: resposta sem imagem (data vazio)");
  return {
    base64: item.b64_json,
    revisedPrompt: item.revised_prompt,
    usage: {
      inputTokens: json.usage?.input_tokens ?? 0,
      outputTokens: json.usage?.output_tokens ?? 0,
    },
  };
}
