import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../lib/ai.js', () => ({}));

const app = (await import('../../app.js')).default;

describe('GET /health', () => {
  it('returns status ok with a timestamp', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(typeof res.body.timestamp).toBe('string');
  });
});
