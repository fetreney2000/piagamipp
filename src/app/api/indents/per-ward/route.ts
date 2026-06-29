import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { createUTCDate } from '@/lib/timezone';

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const type = searchParams.get('type');

    const matchFilter: Record<string, unknown> = {};
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
        $group: {
          _id: '$wardName',
          totalIndents: { $sum: 1 },
          completedIndents: { $sum: { $cond: [{ $eq: ['$counterchecked', true] }, 1, 0] } },
          totalMinutes: { $sum: { $ifNull: ['$totalTimeMinutes', 0] } },
          completedTimes: {
            $push: {
              $cond: [{ $eq: ['$counterchecked', true] }, '$totalTimeMinutes', null],
            },
          },
          under120: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$counterchecked', true] },
                    { $lte: ['$totalTimeMinutes', 120] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          over120: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$counterchecked', true] },
                    { $gt: ['$totalTimeMinutes', 120] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const results = await db.collection('indents').aggregate(pipeline).toArray();

    return NextResponse.json(
      results.map((r: Record<string, unknown>) => {
        const completedTimes = (r.completedTimes as (number | null)[]).filter(
          (t) => t !== null
        ) as number[];
        const completedIndents = r.completedIndents as number;
        const under120 = r.under120 as number;
        const totalMinutes = r.totalMinutes as number;
        const complianceRate =
          completedIndents > 0 ? (under120 / completedIndents) * 100 : 0;
        const averageTime = completedIndents > 0 ? totalMinutes / completedIndents : 0;

        return {
          wardName: r._id,
          totalIndents: r.totalIndents,
          completedIndents,
          under120,
          over120: r.over120,
          complianceRate: Math.round(complianceRate * 100) / 100,
          averageTime: Math.round(averageTime * 100) / 100,
          medianTime: Math.round(median(completedTimes) * 100) / 100,
        };
      })
    );
  } catch {
    return NextResponse.json({ error: 'Failed to fetch per-ward stats' }, { status: 500 });
  }
}
