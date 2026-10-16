import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { createUTCDate } from '@/lib/timezone';
import { isIndentType, parseMonthYear, parsePositiveInt, parseValidDate, parseValidTime, cleanText } from '@/lib/validation';

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
    const monthYear = parseMonthYear(month, year);
    if (monthYear) {
      filter.dateReceived = {
        $gte: createUTCDate(monthYear.year, monthYear.month, 1),
        $lt: createUTCDate(monthYear.year, monthYear.month + 1, 1),
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
      .sort({ dateReceived: -1, timeReceived: -1 })
      .toArray();
    return NextResponse.json(indents);
  } catch (err) {
    console.error('[api/indents] GET failed:', err);
    return NextResponse.json({ error: 'Failed to fetch indents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const dateReceived = parseValidDate(body.dateReceived);
    const timeReceived = parseValidTime(body.timeReceived);
    const wardName = cleanText(body.wardName);
    const numberOfRx = parsePositiveInt(body.numberOfRx);

    if (!dateReceived) {
      return NextResponse.json({ error: 'dateReceived is required and must be a valid date' }, { status: 400 });
    }
    if (!timeReceived) {
      return NextResponse.json({ error: 'timeReceived is required and must be in HH:mm format' }, { status: 400 });
    }
    if (!isIndentType(body.type)) {
      return NextResponse.json({ error: 'type must be one of: office_hour, ipp_shift, on_call' }, { status: 400 });
    }
    if (!wardName) {
      return NextResponse.json({ error: 'wardName is required' }, { status: 400 });
    }
    if (numberOfRx === null) {
      return NextResponse.json({ error: 'numberOfRx must be a positive integer' }, { status: 400 });
    }

    const db = await getDatabase();
    const indent = {
      dateReceived,
      timeReceived,
      type: body.type as string,
      wardName,
      numberOfRx,
      counterchecked: false,
      dateCompleted: null,
      timeCompleted: null,
      totalTimeMinutes: null,
    };

    const result = await db.collection('indents').insertOne(indent);
    return NextResponse.json({ ...indent, _id: result.insertedId }, { status: 201 });
  } catch (err) {
    console.error('[api/indents] POST failed:', err);
    return NextResponse.json({ error: 'Failed to create indent' }, { status: 500 });
  }
}
