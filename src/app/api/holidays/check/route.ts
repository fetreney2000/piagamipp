import { NextRequest, NextResponse } from 'next/server';
import { isSabahPublicHoliday } from '@/lib/holiday';

export async function POST(request: NextRequest) {
  try {
    const { date } = await request.json() as { date: string };
    if (!date || typeof date !== 'string') {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }
    const dateOnly = date.slice(0, 10);
    const isPublicHoliday = await isSabahPublicHoliday(dateOnly);
    return NextResponse.json({ isPublicHoliday });
  } catch {
    return NextResponse.json({ error: 'Failed to check holiday' }, { status: 500 });
  }
}
