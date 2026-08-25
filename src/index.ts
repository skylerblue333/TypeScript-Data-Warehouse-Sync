import { createHash } from 'node:crypto';
import express from 'express';
import { z } from 'zod';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

const recordSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]));
const syncSchema = z.object({
  source: z.string().trim().min(1).max(128),
  destination: z.string().trim().min(1).max(128),
  table: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_.-]+$/),
  primary_key: z.string().trim().min(1).max(128),
  records: z.array(recordSchema).max(1000),
}).strict();

export type SyncRequest = z.infer<typeof syncSchema>;

function stableRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.keys(record).sort().map((key) => [key, record[key]]));
}

export function prepareBatch(input: SyncRequest) {
  const deduplicated = new Map<string, Record<string, unknown>>();
  const rejected: number[] = [];

  input.records.forEach((record, index) => {
    const key = record[input.primary_key];
    if (typeof key !== 'string' && typeof key !== 'number') {
      rejected.push(index);
      return;
    }
    deduplicated.set(String(key), stableRecord(record));
  });

  const rows = [...deduplicated.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, record]) => record);

  const digest = createHash('sha256')
    .update(JSON.stringify({
      source: input.source,
      destination: input.destination,
      table: input.table,
      primary_key: input.primary_key,
      rows,
    }))
    .digest('hex');

  return {
    batch_id: `sha256:${digest}`,
    source: input.source,
    destination: input.destination,
    table: input.table,
    primary_key: input.primary_key,
    input_rows: input.records.length,
    output_rows: rows.length,
    duplicate_rows: input.records.length - rejected.length - rows.length,
    rejected_rows: rejected,
    rows,
  };
}

app.post('/api/v1/prepare', (req, res) => {
  const parsed = syncSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'INVALID_SYNC_BATCH', details: parsed.error.flatten() });
    return;
  }
  res.json(prepareBatch(parsed.data));
});

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', service: 'sky-warehouse-sync' });
});

app.get('/readyz', (_req, res) => {
  res.json({ status: 'ready', mode: 'deterministic-batch-preparation', max_records: 1000 });
});

app.use((_err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(400).json({ error: 'INVALID_REQUEST_BODY' });
});

if (require.main === module) {
  const port = Number.parseInt(process.env.PORT ?? '8080', 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
  app.listen(port, '0.0.0.0', () => console.log(JSON.stringify({ event: 'server_started', service: 'sky-warehouse-sync', port })));
}

export default app;
