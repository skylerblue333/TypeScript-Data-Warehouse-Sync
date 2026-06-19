import request from 'supertest';
import app from '../src/index';

describe('API Tests', () => {
  it('GET /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('POST /api/v1/process - valid', async () => {
    const res = await request(app)
      .post('/api/v1/process')
      .send({ data: { key: 'value' } });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('POST /api/v1/process - invalid', async () => {
    const res = await request(app)
      .post('/api/v1/process')
      .send({ wrong: 'payload' });
    expect(res.status).toBe(400);
  });
});
