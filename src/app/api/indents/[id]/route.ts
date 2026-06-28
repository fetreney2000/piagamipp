import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getMYTCurrentDateTime } from '@/lib/timezone';

function calculateMinutes(dateReceived: Date, timeReceived: string, dateCompleted: Date, timeCompleted: string): number {
  const [rh, rm] = timeReceived.split(':').map(Number);
  const [ry, rmon, rd] = [dateReceived.getUTCFullYear(), dateReceived.getUTCMonth(), dateReceived.getUTCDate()];
  const start = new Date(Date.UTC(ry, rmon, rd, rh, rm));

  const [ch, cm] = timeCompleted.split(':').map(Number);
  const [cy, cmon, cd] = [dateCompleted.getUTCFullYear(), dateCompleted.getUTCMonth(), dateCompleted.getUTCDate()];
  const end = new Date(Date.UTC(cy, cmon, cd, ch, cm));

  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDatabase();
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.dateReceived !== undefined) updateData.dateReceived = new Date(body.dateReceived);
    if (body.timeReceived !== undefined) updateData.timeReceived = body.timeReceived;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.wardName !== undefined) updateData.wardName = body.wardName;
    if (body.numberOfRx !== undefined) updateData.numberOfRx = parseInt(body.numberOfRx);
    if (body.counterchecked !== undefined) {
      updateData.counterchecked = body.counterchecked;
      if (body.counterchecked === true) {
        const { date, time } = getMYTCurrentDateTime();
        updateData.dateCompleted = new Date(date);
        updateData.timeCompleted = time.slice(0, 5);

        const existing = await db.collection('indents').findOne({ _id: new ObjectId(id) });
        if (existing) {
          updateData.totalTimeMinutes = calculateMinutes(
            existing.dateReceived,
            existing.timeReceived,
            updateData.dateCompleted as Date,
            updateData.timeCompleted as string
          );
        }
      } else {
        updateData.dateCompleted = null;
        updateData.timeCompleted = null;
        updateData.totalTimeMinutes = null;
      }
    }

    if (body.dateCompleted !== undefined && body.timeCompleted !== undefined && body.counterchecked === undefined) {
      updateData.dateCompleted = new Date(body.dateCompleted);
      updateData.timeCompleted = body.timeCompleted;
      const existing = await db.collection('indents').findOne({ _id: new ObjectId(id) });
      if (existing) {
        updateData.totalTimeMinutes = calculateMinutes(
          existing.dateReceived,
          existing.timeReceived,
          updateData.dateCompleted as Date,
          updateData.timeCompleted as string
        );
      }
    }

    const result = await db.collection('indents').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Indent not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to update indent' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDatabase();
    const result = await db.collection('indents').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Indent not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete indent' }, { status: 500 });
  }
}
