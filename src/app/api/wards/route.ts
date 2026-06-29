import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await getDatabase();
    const wards = await db.collection('wards').find().project({ _id: 1, name: 1 }).sort({ name: 1 }).toArray();
    return NextResponse.json(wards, {
      headers: { 'Cache-Control': 'no-cache' },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch wards' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    const body = await request.json();

    const existing = await db.collection('wards').findOne({ name: body.name });
    if (existing) {
      return NextResponse.json({ error: 'Ward already exists' }, { status: 409 });
    }

    const result = await db.collection('wards').insertOne({ name: body.name });
    return NextResponse.json({ _id: result.insertedId, name: body.name }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create ward' }, { status: 500 });
  }
}
