import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const type = searchParams.get('type');

    const filter: Record<string, unknown> = {};
    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      filter.dateReceived = {
        $gte: new Date(y, m - 1, 1),
        $lt: new Date(y, m, 1),
      };
    }
    if (type) {
      filter.type = type;
    }

    const indents = await db.collection('indents').find(filter).sort({ dateReceived: -1 }).toArray();
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
