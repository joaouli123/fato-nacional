// Agendador do Fato Nacional — serviço leve sempre ativo no Railway.
// A grade horária agora é CONFIGURÁVEL no /admin (Configurações → Automação):
// antes de cada hora o daemon consulta GET /api/cron/plan (slots, teto diário,
// orçamento) e dispara somente o que o editor habilitou. Sem plano acessível,
// cai na grade legada fixa (5 posts/dia) para nunca parar por falha transitória.
//   Grade legada: 11 news · 14 evergreen · 17 evergreen · 20 service · 23 update (UTC)
// O portal processa em background (202 + polling), driblando o timeout da Cloudflare.

const LEGACY_SLOTS_UTC = [
  { hourUtc: 11, slot: "news", count: 1 },
  { hourUtc: 14, slot: "evergreen", count: 1 },
  { hourUtc: 17, slot: "evergreen", count: 1 },
  { hourUtc: 20, slot: "service", count: 1 },
  { hourUtc: 23, slot: "update", count: 1 },
];
const MINUTE = 5;

const base = (process.env.CRON_TARGET_URL || "https://www.fatonacional.com").replace(/\/$/, "");
const tokenCandidates = [
  ["AUTOMATION_TOKEN", process.env.AUTOMATION_TOKEN],
  ["CRON_TOKEN", process.env.CRON_TOKEN],
  ["IMAGE_GEN_TOKEN", process.env.IMAGE_GEN_TOKEN],
];
const [tokenSource, token] = tokenCandidates
  .map(([source, value]) => [source, value?.trim()])
  .find(([, value]) => value) || [];
if (!token) {
  console.error("AUTOMATION_TOKEN ausente (aliases legados: CRON_TOKEN ou IMAGE_GEN_TOKEN)");
  process.exit(1);
}
const endpoint = `${base}/api/cron/daily-publish`;
const planEndpoint = `${base}/api/cron/plan`;
const headers = { "x-cron-token": token };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPlan() {
  try {
    const res = await fetch(planEndpoint, { headers, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    const plan = await res.json();
    if (!plan || !Array.isArray(plan.schedule)) return null;
    return plan;
  } catch (e) {
    console.log(`[cron] plano indisponível (${e.message}) — usando grade legada`);
    return null;
  }
}

async function runSlot(slot, count = 1) {
  console.log(`[cron] ${new Date().toISOString()} disparando slot=${slot} count=${count}`);
  try {
    const trigger = await fetch(`${endpoint}?slot=${slot}&count=${count}&async=1`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(90_000),
    });
    const body = await trigger.text();
    console.log(`[cron] trigger status=${trigger.status} body=${body.slice(0, 400)}`);
    if (!trigger.ok) return;

    const deadline = Date.now() + 40 * 60 * 1000;
    while (Date.now() < deadline) {
      await sleep(30_000);
      try {
        const res = await fetch(endpoint, { headers, signal: AbortSignal.timeout(60_000) });
        const state = await res.json();
        if (state && state.running === false) {
          console.log(`[cron] slot=${slot} concluído: ${JSON.stringify(state).slice(0, 1500)}`);
          return;
        }
      } catch (e) {
        console.log(`[cron] polling falhou (segue tentando): ${e.message}`);
      }
    }
    console.error(`[cron] slot=${slot}: timeout de 40 min aguardando conclusão`);
  } catch (e) {
    console.error(`[cron] slot=${slot} falhou: ${e.message}`);
  }
}

console.log(`[cron] agendador ativo (plan-driven) → ${endpoint} tokenSource=${tokenSource}`);

// Loop eterno: a cada ciclo, verifica se a hora UTC atual tem slots habilitados
// no plano do /admin e que ainda não foram disparados hoje.
const fired = new Set(); // chaves "YYYY-MM-DD:HH" já processadas

for (;;) {
  const now = new Date();
  const hour = now.getUTCHours();
  const dateKey = now.toISOString().slice(0, 10);
  const key = `${dateKey}:${hour}`;

  if (!fired.has(key) && now.getUTCMinutes() >= MINUTE) {
    fired.add(key);
    // Higiene: não deixa o Set crescer para sempre.
    if (fired.size > 100) {
      for (const k of [...fired].slice(0, 50)) fired.delete(k);
    }

    const plan = await fetchPlan();
    if (plan && plan.enabled === false) {
      console.log(`[cron] ${key}: automação desativada no /admin — nada a fazer`);
    } else if (plan && plan.budget && plan.budget.blocked) {
      console.log(`[cron] ${key}: orçamento excedido (${plan.budget.reason}) — nada a fazer`);
    } else {
      const schedule = plan ? plan.schedule : LEGACY_SLOTS_UTC;
      const due = schedule.filter((e) => e.hourUtc === hour && e.enabled !== false);
      if (!due.length) {
        console.log(`[cron] ${key}: nenhum slot configurado para esta hora`);
      }
      for (const entry of due) {
        await runSlot(entry.slot, Math.max(1, Math.min(3, entry.count || 1)));
        await sleep(60_000); // respiro entre slots da mesma hora
      }
    }
  }

  await sleep(5 * 60 * 1000); // verifica a cada 5 min (resiliente a suspensões)
}
