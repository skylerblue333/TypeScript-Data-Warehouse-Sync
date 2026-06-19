import request from 'supertest';
import app from '../src/index';

describe('TypeScript-Data-Warehouse-Sync', () => {
  it('GET /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('POST /api/v1/sync', async () => {
    const res = await request(app)
      .post('/api/v1/sync')
      .send({ source: 'postgres', destination: 'bigquery', table: 'users', batch_size: 500 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('running');
  });

});
