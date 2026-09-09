export function getEnv(name: string, fallback = "") {
  return process.env[name] || fallback;
}

export function isOpenAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}
