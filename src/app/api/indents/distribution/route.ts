import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { createUTCDate } from '@/lib/timezone';
import { parseMonthYear } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const type = searchParams.get('type');

    const matchFilter: Record<string, unknown> = { counterchecked: true };
    const monthYear = parseMonthYear(month, year);
    if (monthYear) {
      matchFilter.dateReceived = {
        $gte: createUTCDate(monthYear.year, monthYear.month, 1),
        $lt: createUTCDate(monthYear.year, monthYear.month + 1, 1),
      };
    }
    if (type) {
      matchFilter.type = type;
    }

    const pipeline: Record<string, unknown>[] = [
      { $match: matchFilter },
      {
        $bucket: {
          groupBy: '$totalTimeMinutes',
          boundaries: [0, 31, 61, 91, 121, 151, 181],
          default: '180+ min',
          output: { count: { $sum: 1 } },
        },
      },
    ];

    const results = await db.collection('indents').aggregate(pipeline).toArray();
    const buckets = results as Array<{ _id: number | string; count: number }>;

    const labels = ['0-30 min', '31-60 min', '61-90 min', '91-120 min', '121-150 min', '151-180 min', '180+ min'];
    const boundaries = [0, 31, 61, 91, 121, 151, 181];

    const bucketMap = new Map(buckets.map((b) => [b._id, b.count]));
    const distribution = labels.map((label, i) => {
      const id = i < boundaries.length ? boundaries[i] : '180+ min';
      return { range: label, count: bucketMap.get(id) ?? 0 };
    });

    return NextResponse.json(distribution);
  } catch (err) {
    console.error('[api/indents/distribution] GET failed:', err);
    return NextResponse.json({ error: 'Failed to fetch distribution' }, { status: 500 });
  }
}
