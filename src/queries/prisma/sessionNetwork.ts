import { lookupNetwork } from '@/lib/network';
import prisma from '@/lib/prisma';

export async function saveSessionNetwork(
  websiteId: string,
  sessionId: string,
  ipAddress: string,
  capturedAt: Date,
) {
  let network = { organization: null, asn: null, source: 'DB-IP Lite', databaseDate: null };
  try {
    network = await lookupNetwork(ipAddress);
  } catch {
    // Retain the requested IP even if enrichment is unavailable. A later request
    // retries enrichment; never log the address or the database exception.
    console.error('Visitor network lookup unavailable');
  }
  await prisma.client.sessionNetwork.upsert({
    where: { sessionId },
    create: { sessionId, websiteId, ipAddress, capturedAt, ...network },
    update: network,
  });
  return !!network.databaseDate;
}
