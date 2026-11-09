import type { Metadata } from 'next';
import { NetworksPage } from './NetworksPage';
export default async function Page({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;
  return <NetworksPage websiteId={websiteId} />;
}
export const metadata: Metadata = { title: 'Networks' };
