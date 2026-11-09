import { beforeEach, expect, test, vi } from 'vitest';
import prisma from '@/lib/prisma';
import { parseRequest } from '@/lib/request';
import { canUpdateWebsite } from '@/permissions/website';
import { GET } from './route';

vi.mock('@/lib/request', () => ({ parseRequest: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ default: { rawQuery: vi.fn() } }));
vi.mock('@/permissions/website', () => ({ canUpdateWebsite: vi.fn() }));
const query = { startAt: 0, endAt: 100, search: '', page: 1 };
const call = () =>
  GET(new Request('https://example.test/api/websites/id/networks'), {
    params: Promise.resolve({ websiteId: 'id' }),
  });
beforeEach(() => {
  vi.resetAllMocks();
});
test.each([
  {},
  { shareToken: { websiteId: 'id' } },
  { user: { id: 'owner' }, shareToken: { websiteId: 'id' } },
])('denies unauthenticated or share access', async auth => {
  vi.mocked(parseRequest).mockResolvedValue({ auth, query });
  expect((await call()).status).toBe(403);
  expect(prisma.rawQuery).not.toHaveBeenCalled();
});
test('denies an authenticated non-owner', async () => {
  vi.mocked(parseRequest).mockResolvedValue({ auth: { user: { id: 'other' } }, query });
  vi.mocked(canUpdateWebsite).mockResolvedValue(false);
  expect((await call()).status).toBe(403);
  expect(prisma.rawQuery).not.toHaveBeenCalled();
});
test('returns owner results with no-store caching and parameterized search', async () => {
  vi.mocked(parseRequest).mockResolvedValue({
    auth: { user: { id: 'owner' } },
    query: { ...query, search: "x' OR true--" },
  });
  vi.mocked(canUpdateWebsite).mockResolvedValue(true);
  vi.mocked(prisma.rawQuery)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ total: 0 }]);
  const response = await call();
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(await response.json()).toMatchObject({ count: 0, data: [] });
  expect(vi.mocked(prisma.rawQuery).mock.calls[0][0]).not.toContain("x' OR true--");
  expect(vi.mocked(prisma.rawQuery).mock.calls[0][1]).toMatchObject({
    search: "x' OR true--",
    websiteId: 'id',
  });
});
