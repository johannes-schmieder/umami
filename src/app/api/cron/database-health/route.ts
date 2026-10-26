import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const headers = { 'Cache-Control': 'no-store' };

// A real, read-only database check. It never creates analytics events or sessions.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401, headers });
  }

  try {
    const [website, user] = await Promise.all([
      prisma.client.website.findFirst({ select: { id: true } }),
      prisma.client.user.findFirst({ select: { id: true } }),
      prisma.client.$queryRaw`SELECT pg_database_size(current_database())`,
    ]);
    if (!website || !user) {
      throw new Error('Incomplete analytics installation');
    }
    console.info('Daily analytics database health check passed');
    return Response.json({ ok: true, checkedAt: new Date().toISOString() }, { headers });
  } catch {
    // Do not log database errors: connection strings may contain credentials.
    console.error('Daily analytics database health check failed');
    return Response.json({ ok: false }, { status: 503, headers });
  }
}
