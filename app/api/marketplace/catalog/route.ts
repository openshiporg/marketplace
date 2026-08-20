import { NextRequest, NextResponse } from 'next/server';
import { readPublicMarketplace } from '@/lib/public-marketplace-reader';

export const dynamic = 'force-static';

export function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const result = readPublicMarketplace({
      query: params.get('query') || undefined,
      merchantId: params.get('merchantId') || undefined,
      collectionId: params.get('collectionId') || undefined,
      limit: params.has('limit') ? Number(params.get('limit')) : undefined,
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid catalog request' }, { status: 400 });
  }
}
