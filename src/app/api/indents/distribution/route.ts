import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { createUTCDate } from '@/lib/timezone';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const type = searchParams.get('type');

    const matchFilter: Record<string, unknown> = { counterchecked: true };
    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      matchFilter.dateReceived = {
        $gte: createUTCDate(y, m, 1),
        $lt: createUTCDate(y, m + 1, 1),
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

    const boundaries = [0, 31, 61, 91, 121, 151, 181];
    const labels = [
      '0-30 min',
      '31-60 min',
      '61-90 min',
      '91-120 min',
      '121-150 min',
      '151-180 min',
      '180+ min',
    ];

    const distribution = labels.map((label, i) => {
      let id: number | string;
      if (i < boundaries.length) {
        id = boundaries[i];
      } else {
        id = '180+ min';
      }
      const found = buckets.find((b) => b._id === id);
      return { range: label, count: found ? found.count : 0 };
    });

    return NextResponse.json(distribution);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch distribution' }, { status: 500 });
  }
}
