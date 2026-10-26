import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ website: vi.fn(), user: vi.fn(), query: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  default: {
    client: {
      website: { findFirst: mocks.website },
      user: { findFirst: mocks.user },
      $queryRaw: mocks.query,
    },
  },
}));

import { GET } from './route';

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', 'test-cron-secret');
  mocks.website.mockReset().mockResolvedValue({ id: 'website' });
  mocks.user.mockReset().mockResolvedValue({ id: 'user' });
  mocks.query.mockReset().mockResolvedValue([]);
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.unstubAllEnvs());

const request = (authorization?: string) =>
  new Request('https://example.com/api/cron/database-health', {
    headers: authorization ? { authorization } : {},
  });

test.each([undefined, 'Bearer incorrect', 'test-cron-secret'])(
  'rejects unauthorized requests before querying the database (%s)',
  async authorization => {
    expect((await GET(request(authorization))).status).toBe(401);
    expect(mocks.website).not.toHaveBeenCalled();
    expect(mocks.user).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
  },
);

test('fails closed when the secret is not configured', async () => {
  vi.stubEnv('CRON_SECRET', '');
  expect((await GET(request('Bearer '))).status).toBe(401);
  expect(mocks.query).not.toHaveBeenCalled();
});

test('performs all database checks and prevents response caching', async () => {
  const response = await GET(request('Bearer test-cron-secret'));
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({ ok: true, checkedAt: expect.any(String) });
  expect(mocks.website).toHaveBeenCalledOnce();
  expect(mocks.user).toHaveBeenCalledOnce();
  expect(mocks.query).toHaveBeenCalledOnce();
});

test('reports database failures without exposing error details', async () => {
  mocks.query.mockRejectedValue(new Error('secret connection string'));
  const response = await GET(request('Bearer test-cron-secret'));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ ok: false });
  expect(console.error).toHaveBeenCalledWith('Daily analytics database health check failed');
});

test('does not report an uninitialized database as healthy', async () => {
  mocks.website.mockResolvedValue(null);
  expect((await GET(request('Bearer test-cron-secret'))).status).toBe(503);
});
