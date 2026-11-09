import { existsSync } from 'node:fs';
import { expect, test } from 'vitest';
import { lookupNetwork } from './network';

test.skipIf(!existsSync('geo/dbip-asn-lite.mmdb'))(
  'bundled database resolves university and IPv6 with valid provenance',
  async () => {
    const bu = await lookupNetwork('128.197.1.1');
    expect(bu.organization).toBe('Boston University');
    expect(bu.asn).toBe('AS111');
    expect(bu.databaseDate.getTime()).toBeGreaterThan(0);
    const ipv6 = await lookupNetwork('2001:4860:4860::8888');
    expect(ipv6.asn).toBe('AS15169');
  },
);
