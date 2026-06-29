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
    const ward = searchParams.get('ward');
    const policy = searchParams.get('policy');

    const filter: Record<string, unknown> = {};
    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      filter.dateReceived = {
        $gte: createUTCDate(y, m, 1),
        $lt: createUTCDate(y, m + 1, 1),
      };
    }
    if (type) {
      filter.type = type;
    }
    if (ward) {
      filter.wardName = ward;
    }
    if (policy === 'achieved') {
      filter.counterchecked = true;
      filter.totalTimeMinutes = { $lte: 120 };
    } else if (policy === 'exceeded') {
      filter.counterchecked = true;
      filter.totalTimeMinutes = { $gt: 120 };
    } else if (policy === 'pending') {
      filter.counterchecked = false;
    }

    const indents = await db.collection('indents')
      .find(filter, {
        projection: {
          _id: 1, dateReceived: 1, timeReceived: 1, type: 1,
          wardName: 1, numberOfRx: 1, counterchecked: 1,
          dateCompleted: 1, timeCompleted: 1, totalTimeMinutes: 1,
        },
      })
      .sort({ dateReceived: -1 })
      .toArray();
    return NextResponse.json(indents);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch indents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    const body = await request.json();

    const indent = {
      dateReceived: new Date(body.dateReceived),
      timeReceived: body.timeReceived,
      type: body.type,
      wardName: body.wardName,
      numberOfRx: parseInt(body.numberOfRx),
      counterchecked: false,
      dateCompleted: null,
      timeCompleted: null,
      totalTimeMinutes: null,
    };

    const result = await db.collection('indents').insertOne(indent);
    return NextResponse.json({ ...indent, _id: result.insertedId }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create indent' }, { status: 500 });
  }
}
