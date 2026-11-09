import path from 'node:path';
import ipaddr from 'ipaddr.js';
import maxmind, { type AsnResponse, type Reader } from 'maxmind';

let reader: Promise<Reader<AsnResponse>>;

export function collectsNetwork(websiteId?: string) {
  return (
    !!websiteId &&
    (process.env.COLLECT_NETWORK_WEBSITE_IDS || '')
      .split(',')
      .map(s => s.trim())
      .includes(websiteId)
  );
}

// Only the deployment's trusted proxy header is accepted. No payload IPs or
// arbitrary CDN headers: those can be supplied by an unauthenticated client.
export function getNetworkIp(headers: Headers): string | undefined {
  const header = process.env.VERCEL ? 'x-vercel-forwarded-for' : process.env.CLIENT_IP_HEADER;
  const value = header && headers.get(header)?.trim();
  if (!value || !ipaddr.isValid(value)) return undefined;
  const address = ipaddr.process(value);
  return address.range() === 'unicast' ? address.toString() : undefined;
}

export async function lookupNetwork(ip: string) {
  reader ??= maxmind.open<AsnResponse>(path.join(process.cwd(), 'geo', 'dbip-asn-lite.mmdb'));
  try {
    const db = await reader;
    const result = db.get(ip);
    return {
      organization: result?.autonomous_system_organization?.slice(0, 255) || null,
      asn: result?.autonomous_system_number ? `AS${result.autonomous_system_number}` : null,
      source: 'DB-IP Lite',
      databaseDate: db.metadata.buildEpoch,
    };
  } catch {
    reader = undefined;
    throw new Error('Network database unavailable');
  }
}
