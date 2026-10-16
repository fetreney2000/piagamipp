import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getMYTCurrentDateTime } from '@/lib/timezone';
import { calculateMinutes } from '@/lib/total-time';
import { isIndentType, parsePositiveInt, parseValidDate, parseValidTime, cleanText } from '@/lib/validation';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid indent id' }, { status: 400 });
    }

    const db = await getDatabase();
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.dateReceived !== undefined) {
      const dateReceived = parseValidDate(body.dateReceived);
      if (!dateReceived) {
        return NextResponse.json({ error: 'dateReceived must be a valid date' }, { status: 400 });
      }
      updateData.dateReceived = dateReceived;
    }
    if (body.timeReceived !== undefined) {
      const timeReceived = parseValidTime(body.timeReceived);
      if (!timeReceived) {
        return NextResponse.json({ error: 'timeReceived must be in HH:mm format' }, { status: 400 });
      }
      updateData.timeReceived = timeReceived;
    }
    if (body.type !== undefined) {
      if (!isIndentType(body.type)) {
        return NextResponse.json({ error: 'type must be one of: office_hour, ipp_shift, on_call' }, { status: 400 });
      }
      updateData.type = body.type;
    }
    if (body.wardName !== undefined) {
      const wardName = cleanText(body.wardName);
      if (!wardName) {
        return NextResponse.json({ error: 'wardName is required' }, { status: 400 });
      }
      updateData.wardName = wardName;
    }
    if (body.numberOfRx !== undefined) {
      const numberOfRx = parsePositiveInt(body.numberOfRx);
      if (numberOfRx === null) {
        return NextResponse.json({ error: 'numberOfRx must be a positive integer' }, { status: 400 });
      }
      updateData.numberOfRx = numberOfRx;
    }

    if (body.counterchecked !== undefined) {
      if (typeof body.counterchecked !== 'boolean') {
        return NextResponse.json({ error: 'counterchecked must be a boolean' }, { status: 400 });
      }

      const existing = await db.collection('indents').findOne({ _id: new ObjectId(id) });
      const wasAlreadyCounterchecked = existing?.counterchecked === true;

      updateData.counterchecked = body.counterchecked;

      // Prefer the received values being updated over the stored ones when
      // (re)calculating total time, so correcting a received date/time is reflected.
      const effectiveReceivedDate = (updateData.dateReceived as Date | undefined) ?? existing?.dateReceived;
      const effectiveReceivedTime = (updateData.timeReceived as string | undefined) ?? existing?.timeReceived;

      if (body.counterchecked === true && !wasAlreadyCounterchecked) {
        // Newly counterchecked — record completion time now
        const { date, time } = getMYTCurrentDateTime();
        updateData.dateCompleted = new Date(date);
        updateData.timeCompleted = time.slice(0, 5);

        if (effectiveReceivedDate && effectiveReceivedTime) {
          updateData.totalTimeMinutes = calculateMinutes(
            effectiveReceivedDate,
            effectiveReceivedTime,
            updateData.dateCompleted as Date,
            updateData.timeCompleted as string
          );
        }
      } else if (body.counterchecked === false) {
        // Countercheck removed — clear completion fields
        updateData.dateCompleted = null;
        updateData.timeCompleted = null;
        updateData.totalTimeMinutes = null;
      } else if (body.counterchecked === true && wasAlreadyCounterchecked) {
        if (body.dateCompleted !== undefined) {
          const dateCompleted = parseValidDate(body.dateCompleted);
          if (!dateCompleted) {
            return NextResponse.json({ error: 'dateCompleted must be a valid date' }, { status: 400 });
          }
          updateData.dateCompleted = dateCompleted;
        }
        if (body.timeCompleted !== undefined) {
          const timeCompleted = parseValidTime(body.timeCompleted);
          if (!timeCompleted) {
            return NextResponse.json({ error: 'timeCompleted must be in HH:mm format' }, { status: 400 });
          }
          updateData.timeCompleted = timeCompleted;
        }

        const receivedChanged =
          updateData.dateReceived !== undefined || updateData.timeReceived !== undefined;
        const completedChanged =
          body.dateCompleted !== undefined || body.timeCompleted !== undefined;
        const effectiveCompletedDate = (updateData.dateCompleted as Date | undefined) ?? existing?.dateCompleted;
        const effectiveCompletedTime = (updateData.timeCompleted as string | undefined) ?? existing?.timeCompleted;

        if (
          (receivedChanged || completedChanged) &&
          effectiveReceivedDate && effectiveReceivedTime &&
          effectiveCompletedDate && effectiveCompletedTime
        ) {
          updateData.totalTimeMinutes = calculateMinutes(
            effectiveReceivedDate,
            effectiveReceivedTime,
            effectiveCompletedDate,
            effectiveCompletedTime
          );
        }
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
  } catch (err) {
    console.error('[api/indents/:id] PUT failed:', err);
    return NextResponse.json({ error: 'Failed to update indent' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid indent id' }, { status: 400 });
    }

    const db = await getDatabase();
    const result = await db.collection('indents').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Indent not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/indents/:id] DELETE failed:', err);
    return NextResponse.json({ error: 'Failed to delete indent' }, { status: 500 });
  }
}
