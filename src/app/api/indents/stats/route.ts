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
          _id: null,
          totalIndents: { $sum: 1 },
          completedIndents: { $sum: { $cond: [{ $eq: ['$counterchecked', true] }, 1, 0] } },
          pendingIndents: { $sum: { $cond: [{ $eq: ['$counterchecked', false] }, 1, 0] } },
          totalMinutes: { $sum: { $ifNull: ['$totalTimeMinutes', 0] } },
          completedTimes: { $push: { $cond: [{ $eq: ['$counterchecked', true] }, '$totalTimeMinutes', null] } },
          under120: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$counterchecked', true] }, { $lte: ['$totalTimeMinutes', 120] }] },
                1,
                0,
              ],
            },
          },
          over120: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$counterchecked', true] }, { $gt: ['$totalTimeMinutes', 120] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ];

    const result = await db.collection('indents').aggregate(pipeline).toArray();

    if (result.length === 0) {
      return NextResponse.json({
        totalIndents: 0,
        completedIndents: 0,
        pendingIndents: 0,
        under120: 0,
        over120: 0,
        complianceRate: 0,
        averageTime: 0,
        medianTime: 0,
      });
    }

    const data = result[0];
    const completedTimes = data.completedTimes.filter((t: number | null) => t !== null) as number[];
    const complianceRate = data.completedIndents > 0
      ? (data.under120 / data.completedIndents) * 100
      : 0;
    const averageTime = data.completedIndents > 0
      ? data.totalMinutes / data.completedIndents
      : 0;

    return NextResponse.json({
      totalIndents: data.totalIndents,
      completedIndents: data.completedIndents,
      pendingIndents: data.pendingIndents,
      under120: data.under120,
      over120: data.over120,
      complianceRate: Math.round(complianceRate * 100) / 100,
      averageTime: Math.round(averageTime * 100) / 100,
      medianTime: Math.round(median(completedTimes) * 100) / 100,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
