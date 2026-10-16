import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { cleanText } from '@/lib/validation';

export async function GET() {
  try {
    const db = await getDatabase();
    const wards = await db.collection('wards').find().project({ _id: 1, name: 1 }).sort({ name: 1 }).toArray();
    return NextResponse.json(wards);
  } catch (err) {
    console.error('[api/wards] GET failed:', err);
    return NextResponse.json({ error: 'Failed to fetch wards' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const name = cleanText(body.name);
    if (!name) {
      return NextResponse.json({ error: 'Ward name is required' }, { status: 400 });
    }

    const db = await getDatabase();
    const existing = await db.collection('wards').findOne({ name });
    if (existing) {
      return NextResponse.json({ error: 'Ward already exists' }, { status: 409 });
    }

    const result = await db.collection('wards').insertOne({ name });
    return NextResponse.json({ _id: result.insertedId, name }, { status: 201 });
  } catch (err) {
    console.error('[api/wards] POST failed:', err);
    return NextResponse.json({ error: 'Failed to create ward' }, { status: 500 });
  }
}
