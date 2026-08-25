import request from 'supertest';
import app, { prepareBatch } from '../src/index';

describe('Sky Warehouse Sync', () => {
  const records: Array<Record<string, string | number | boolean | null>> = [
    { id: 2, name: 'Bob', active: true },
    { id: 1, name: 'Alice', active: true },
    { id: 2, name: 'Robert', active: false },
    { name: 'missing-id' },
  ];

  const batch = {
    source: 'postgres',
    destination: 'warehouse',
    table: 'public.users',
    primary_key: 'id',
    records,
  };

  it('prepares a deterministic deduplicated batch', () => {
    const first = prepareBatch(batch);
    const second = prepareBatch(batch);

    expect(first.batch_id).toBe(second.batch_id);
    expect(first.input_rows).toBe(4);
    expect(first.output_rows).toBe(2);
    expect(first.duplicate_rows).toBe(1);
    expect(first.rejected_rows).toEqual([3]);
    expect(first.rows).toEqual([
      { active: true, id: 1, name: 'Alice' },
      { active: false, id: 2, name: 'Robert' },
    ]);
  });

  it('changes the digest when prepared data changes', () => {
    const first = prepareBatch(batch);
    const changed = prepareBatch({ ...batch, records: [{ id: 1, name: 'Changed', active: true }] });
    expect(changed.batch_id).not.toBe(first.batch_id);
  });

  it('serves prepare, health, and readiness endpoints', async () => {
    const prepared = await request(app).post('/api/v1/prepare').send(batch);
    expect(prepared.status).toBe(200);
    expect(prepared.body.output_rows).toBe(2);
    expect(prepared.body.batch_id).toMatch(/^sha256:[a-f0-9]{64}$/);

    expect((await request(app).get('/healthz')).body).toEqual({ status: 'ok', service: 'sky-warehouse-sync' });
    expect((await request(app).get('/readyz')).status).toBe(200);
  });

  it('rejects invalid tables, oversized batches, and malformed bodies', async () => {
    expect((await request(app).post('/api/v1/prepare').send({ ...batch, table: 'bad table name' })).status).toBe(400);

    const oversizedRecords = Array.from({ length: 1001 }, (_, id) => ({ id }));
    expect((await request(app).post('/api/v1/prepare').send({ ...batch, records: oversizedRecords })).status).toBe(400);

    expect((await request(app).post('/api/v1/prepare').set('Content-Type', 'application/json').send('{bad')).status).toBe(400);
  });
});
