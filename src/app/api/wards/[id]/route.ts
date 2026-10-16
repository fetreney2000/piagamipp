import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cleanText } from '@/lib/validation';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ward id' }, { status: 400 });
    }

    const body = await request.json();

    const name = cleanText(body.name);
    if (!name) {
      return NextResponse.json({ error: 'Ward name is required' }, { status: 400 });
    }

    const db = await getDatabase();
    const existing = await db.collection('wards').findOne({ name, _id: { $ne: new ObjectId(id) } });
    if (existing) {
      return NextResponse.json({ error: 'Ward name already exists' }, { status: 409 });
    }

    const result = await db.collection('wards').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { name } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Ward not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/wards/:id] PUT failed:', err);
    return NextResponse.json({ error: 'Failed to update ward' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ward id' }, { status: 400 });
    }

    const db = await getDatabase();
    const result = await db.collection('wards').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Ward not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/wards/:id] DELETE failed:', err);
    return NextResponse.json({ error: 'Failed to delete ward' }, { status: 500 });
  }
}
