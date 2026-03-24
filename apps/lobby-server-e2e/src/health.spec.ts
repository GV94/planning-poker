import { describe, it, expect } from 'vitest';
import './setup.js';
import { getPort } from './setup.js';

describe('Health endpoint', () => {
  it('GET /health returns 200 with { status: "ok" }', async () => {
    const res = await fetch(`http://localhost:${getPort()}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});
