/**
 * Approximate USD price per 1M tokens (input/output) for OpenCode Zen models.
 * Estimates for observability — adjust as exact pricing becomes known.
 */
type Price = { in: number; out: number };

const PRICES: Array<{ match: RegExp; price: Price }> = [
  { match: /gpt-5\.\d-(pro)/i, price: { in: 5, out: 20 } },
  { match: /gpt-5\.\d-(mini|nano)/i, price: { in: 0.3, out: 1.2 } },
  { match: /gpt-5/i, price: { in: 2.5, out: 10 } },
  { match: /gemini-3\.\d-pro/i, price: { in: 2, out: 10 } },
  { match: /gemini/i, price: { in: 0.3, out: 1.2 } },
  { match: /claude-opus/i, price: { in: 15, out: 75 } },
  { match: /claude/i, price: { in: 3, out: 15 } },
  { match: /deepseek|glm|kimi|qwen|minimax|grok/i, price: { in: 0.4, out: 1.5 } },
];

const DEFAULT_PRICE: Price = { in: 1, out: 4 };

export function estimateCostUsd(model: string, inputTokens = 0, outputTokens = 0): number {
  const price = PRICES.find((entry) => entry.match.test(model))?.price ?? DEFAULT_PRICE;
  const cost = (inputTokens / 1_000_000) * price.in + (outputTokens / 1_000_000) * price.out;
  return Math.round(cost * 1e6) / 1e6;
}
