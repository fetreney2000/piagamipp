import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '12');

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const pipeline: Record<string, unknown>[] = [
      {
        $match: {
          dateReceived: { $gte: startDate },
          counterchecked: true,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$dateReceived' },
            month: { $month: '$dateReceived' },
          },
          totalCompleted: { $sum: 1 },
          under120: {
            $sum: { $cond: [{ $lte: ['$totalTimeMinutes', 120] }, 1, 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ];

    const results = await db.collection('indents').aggregate(pipeline).toArray();

    const trends = results.map((r: Record<string, unknown>) => {
      const group = r._id as { year: number; month: number };
      const totalCompleted = r.totalCompleted as number;
      const under120 = r.under120 as number;
      return {
        month: group.month,
        year: group.year,
        complianceRate:
          totalCompleted > 0 ? Math.round((under120 / totalCompleted) * 10000) / 100 : 0,
      };
    });

    return NextResponse.json(trends, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 });
  }
}
