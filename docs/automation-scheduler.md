# Agendamento editorial

## Fonte canônica

O agendamento canônico é o fluxo BullMQ:

`apps/scheduler` → fila `editorial-agents` → `apps/worker` → rotas `/api/cron/*` do portal.

O serviço `apps/cron` foi preservado como fallback legado para ambientes que ainda
não migraram para Redis/BullMQ. Ele **não deve rodar ao mesmo tempo** que
`apps/scheduler` e `apps/worker`, pois ambos disparam a mesma grade e podem gerar
publicações duplicadas.

O scheduler não apaga agendas desconhecidas encontradas na fila. Ele registra o
evento `scheduler.unmanaged_schedules_detected`; confira e desative manualmente
qualquer agenda que duplique a grade antes de ativar o fluxo canônico.

A grade canônica fica em `apps/scheduler/src/schedules.ts`, no fuso definido por
`SCHEDULE_TIMEZONE` (por padrão, `America/Sao_Paulo`):

| Horário | Ação | Slot enviado ao portal |
| --- | --- | --- |
| 06:30 | ingestão | `ingest` |
| 07:00 | publicação | `news` |
| 10:00 | publicação | `evergreen` |
| 13:00 | publicação | `evergreen` |
| 16:00 | publicação | `service` |
| 19:00 | publicação | `update` |

Os valores de publicação são um enum compartilhado (`news`, `evergreen`,
`service`, `update`). Rótulos de interface ou horários não são aceitos como slot.

## Credencial de automação

`AUTOMATION_TOKEN` é a variável canônica. Configure o mesmo segredo no portal,
worker e, se ele ainda for necessário, no cron legado.

Para permitir implantação gradual sem indisponibilidade, existem aliases:

- publicação: `CRON_TOKEN` e `IMAGE_GEN_TOKEN`;
- ingestão: `CRON_TOKEN` e `INIT_SCHEMA_TOKEN`.

O worker e o cron preferem sempre `AUTOMATION_TOKEN`. Os aliases existem apenas
para migração e podem ser removidos depois que todos os serviços estiverem usando
a variável canônica. `INIT_SCHEMA_TOKEN` continua separado para operações
administrativas de bootstrap, e `IMAGE_GEN_TOKEN` continua separado para rotas
administrativas de mídia; não reutilize esses segredos em novas automações.

## Operação manual

`pnpm --filter @nexo/scheduler enqueue:once` cria uma publicação evergreen em
modo dry-run. Use `MANUAL_SLOT=news|evergreen|service|update` para escolher outro
slot, `MANUAL_DRY=0` para execução real ou `MANUAL_ACTION=ingest` para ingestão.
