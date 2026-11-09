import fs from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import maxmind from 'maxmind';

const dir = path.resolve('geo');
await fs.mkdir(dir, { recursive: true });
// Monthly free database. No visitor addresses are transmitted to DB-IP.
const month = new Date().toISOString().slice(0, 7);
const url = `https://download.db-ip.com/free/dbip-asn-lite-${month}.mmdb.gz`;
const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
if (!response.ok) throw new Error(`ASN download failed: ${response.status}`);
const bytes = gunzipSync(Buffer.from(await response.arrayBuffer()));
const file = path.join(dir, 'dbip-asn-lite.mmdb');
await fs.writeFile(file, bytes);
const db = await maxmind.open(file);
if (!db.get('8.8.8.8')?.autonomous_system_organization)
  throw new Error('ASN database validation failed');
console.log(`DB-IP Lite ASN database ready: ${month}, ${bytes.length} bytes`);
