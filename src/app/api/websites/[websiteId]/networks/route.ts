import { z } from 'zod';
import prisma from '@/lib/prisma';
import { parseRequest } from '@/lib/request';
import { canUpdateWebsite } from '@/permissions/website';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
const schema = z
  .object({
    startAt: z.coerce.number().int().min(0).max(8640000000000000),
    endAt: z.coerce.number().int().min(0).max(8640000000000000),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    search: z.string().max(255).default(''),
  })
  .refine(q => q.endAt >= q.startAt);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { auth, query, error } = await parseRequest(request, schema);
  if (error) return error();
  const { websiteId } = await params;
  // Shares (including a signed-in user's share context) cannot access raw IPs.
  if (!auth?.user || auth.shareToken || !(await canUpdateWebsite(auth, websiteId))) {
    return Response.json({ error: 'Website owner access required' }, { status: 403, headers });
  }
  const pageSize = 50;
  const args = {
    websiteId,
    startDate: new Date(query.startAt),
    endDate: new Date(query.endAt),
    search: query.search,
  };
  const sql = `
    select n.ip_address as "ipAddress", n.organization, n.asn,
      count(distinct e.session_id)::int as sessions,
      count(*) filter (where e.event_type = 1)::int as pageviews,
      min(e.created_at) as "firstSeen", max(e.created_at) as "lastSeen",
      max(n.database_date) as "databaseDate"
    from session_network n
    join website_event e on e.session_id = n.session_id and e.website_id = n.website_id
    where n.website_id = {{websiteId}}::uuid
      and e.created_at >= n.captured_at
      and e.created_at between {{startDate}} and {{endDate}}
      and ({{search}} = '' or strpos(lower(n.ip_address || ' ' || coalesce(n.organization, '') || ' ' || coalesce(n.asn, '')), lower({{search}})) > 0)
    group by n.ip_address, n.organization, n.asn
  `;
  const [rows, count] = await Promise.all([
    prisma.rawQuery(`${sql} order by "lastSeen" desc, n.ip_address limit 50 offset {{offset}}`, {
      ...args,
      offset: (query.page - 1) * pageSize,
    }),
    prisma.rawQuery(`select count(*)::int as total from (${sql}) networks`, args),
  ]);
  return Response.json(
    { data: rows, count: count[0].total, page: query.page, pageSize },
    { headers },
  );
}
