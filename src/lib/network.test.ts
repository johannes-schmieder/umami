import { afterEach, describe, expect, test, vi } from 'vitest';
import { collectsNetwork, getNetworkIp } from './network';

afterEach(() => vi.unstubAllEnvs());
describe('trusted network collection', () => {
  test('is disabled except for explicitly opted-in website IDs', () => {
    vi.stubEnv('COLLECT_NETWORK_WEBSITE_IDS', 'one, two');
    expect(collectsNetwork('two')).toBe(true);
    expect(collectsNetwork('three')).toBe(false);
    expect(collectsNetwork(undefined)).toBe(false);
  });
  test('trusts only Vercel ingress, not arbitrary forwarding headers', () => {
    vi.stubEnv('VERCEL', '1');
    expect(
      getNetworkIp(
        new Headers({ 'x-vercel-forwarded-for': '8.8.8.8', 'cf-connecting-ip': '1.1.1.1' }),
      ),
    ).toBe('8.8.8.8');
    expect(getNetworkIp(new Headers({ 'x-forwarded-for': '1.1.1.1' }))).toBeUndefined();
  });
  test.each([
    '10.0.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '::1',
    'fc00::1',
    '192.0.2.1',
    '8.8.8.8, 1.1.1.1',
    'invalid',
    '',
  ])('rejects private, reserved, ambiguous or invalid IP %s', ip => {
    vi.stubEnv('VERCEL', '1');
    expect(getNetworkIp(new Headers({ 'x-vercel-forwarded-for': ip }))).toBeUndefined();
  });
  test('normalizes mapped IPv4 and supports public IPv6', () => {
    vi.stubEnv('VERCEL', '1');
    expect(getNetworkIp(new Headers({ 'x-vercel-forwarded-for': '::ffff:8.8.8.8' }))).toBe(
      '8.8.8.8',
    );
    expect(getNetworkIp(new Headers({ 'x-vercel-forwarded-for': '2001:4860:4860::8888' }))).toBe(
      '2001:4860:4860::8888',
    );
  });
});
