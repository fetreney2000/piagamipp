import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const parsedMonths = Number.parseInt(searchParams.get('months') || '12', 10);
    const months = Number.isInteger(parsedMonths) ? Math.min(Math.max(parsedMonths, 1), 24) : 12;

    // dateReceived is stored as UTC midnight of the MYT date, and $year/$month below
    // group in UTC — compute the window in UTC too so month boundaries line up.
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + 1, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const pipeline: Record<string, unknown>[] = [
      {
        $match: {
          dateReceived: { $gte: start, $lt: end },
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
    ];

    const results = await db.collection('indents').aggregate(pipeline).toArray();

    const rateByKey = new Map<string, number>();
    for (const r of results) {
      const group = r._id as { year: number; month: number };
      const totalCompleted = r.totalCompleted as number;
      const under120 = r.under120 as number;
      if (totalCompleted > 0) {
        rateByKey.set(
          `${group.year}-${group.month}`,
          Math.round((under120 / totalCompleted) * 10000) / 100
        );
      }
    }

    // Return every month in the window. Months without completed indents get
    // complianceRate: null so the chart renders an honest gap instead of
    // silently skipping the month and connecting across it.
    const trends: Array<{ month: number; year: number; complianceRate: number | null }> = [];
    const cursor = new Date(start);
    while (cursor.getTime() < end.getTime()) {
      const year = cursor.getUTCFullYear();
      const month = cursor.getUTCMonth() + 1;
      trends.push({ month, year, complianceRate: rateByKey.get(`${year}-${month}`) ?? null });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    return NextResponse.json(trends);
  } catch (err) {
    console.error('[api/indents/trends] GET failed:', err);
    return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 });
  }
}
