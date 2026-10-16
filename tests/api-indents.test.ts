import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// The mongodb module creates a client at import time — mock it entirely.
vi.mock('@/lib/mongodb', () => ({
  getDatabase: vi.fn(),
  ensureIndexes: vi.fn(),
}));

// Freeze the server clock so countercheck totals are deterministic.
vi.mock('@/lib/timezone', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/timezone')>();
  return {
    ...actual,
    getMYTCurrentDateTime: () => ({ date: '2026-10-16', time: '12:34:56' }),
  };
});

import { GET, POST } from '@/app/api/indents/route';
import { DELETE, PUT } from '@/app/api/indents/[id]/route';
import { GET as GET_TRENDS } from '@/app/api/indents/trends/route';
import { getDatabase } from '@/lib/mongodb';

const collection = {
  find: vi.fn(),
  insertOne: vi.fn(),
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  deleteOne: vi.fn(),
  aggregate: vi.fn(),
};

const db = { collection: () => collection };
const ID = new ObjectId().toHexString();

function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ id: ID }) };

beforeEach(() => {
  vi.clearAllMocks();
  (getDatabase as Mock).mockResolvedValue(db);
});

describe('GET /api/indents', () => {
  it('ignores garbage month/year filters instead of erroring', async () => {
    collection.find.mockReturnValue({ sort: () => ({ toArray: async () => [] }) });

    const res = await GET(jsonRequest('http://test/api/indents?month=abc&year=xyz', 'GET'));
    expect(res.status).toBe(200);
    expect(collection.find).toHaveBeenCalledWith({}, expect.anything());
  });

  it('applies a date filter for valid month/year params', async () => {
    collection.find.mockReturnValue({ sort: () => ({ toArray: async () => [] }) });

    await GET(jsonRequest('http://test/api/indents?month=10&year=2026', 'GET'));
    const filter = collection.find.mock.calls[0][0] as { dateReceived: { $gte: Date; $lt: Date } };
    expect(filter.dateReceived.$gte.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(filter.dateReceived.$lt.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });
});

describe('POST /api/indents validation', () => {
  const valid = {
    dateReceived: '2026-10-16T00:00:00.000Z',
    timeReceived: '10:00',
    type: 'office_hour',
    wardName: '4B',
    numberOfRx: 2,
  };

  const invalidCases: Array<[string, Record<string, unknown>]> = [
    ['missing everything', {}],
    ['invalid date', { ...valid, dateReceived: 'garbage' }],
    ['invalid time', { ...valid, timeReceived: '25:99' }],
    ['invalid type', { ...valid, type: 'holiday' }],
    ['blank ward', { ...valid, wardName: '   ' }],
    ['NaN rx', { ...valid, numberOfRx: 'abc' }],
    ['zero rx', { ...valid, numberOfRx: 0 }],
  ];

  it.each(invalidCases)('rejects %s with 400 and stores nothing', async (_name, body) => {
    const res = await POST(jsonRequest('http://test/api/indents', 'POST', body));
    expect(res.status).toBe(400);
    expect(collection.insertOne).not.toHaveBeenCalled();
  });

  it('creates a valid indent with normalized fields', async () => {
    collection.insertOne.mockResolvedValue({ insertedId: new ObjectId() });

    const res = await POST(jsonRequest('http://test/api/indents', 'POST', { ...valid, wardName: '  4B  ' }));
    expect(res.status).toBe(201);
    expect(collection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        wardName: '4B',
        numberOfRx: 2,
        counterchecked: false,
        dateCompleted: null,
        totalTimeMinutes: null,
      })
    );
  });
});

describe('PUT /api/indents/:id', () => {
  it('rejects a malformed id with 400 (not 500)', async () => {
    const res = await PUT(
      jsonRequest('http://test/api/indents/bad', 'PUT', { counterchecked: true }),
      { params: Promise.resolve({ id: 'bad' }) }
    );
    expect(res.status).toBe(400);
  });

  it('rejects a non-boolean counterchecked', async () => {
    const res = await PUT(jsonRequest(`http://test/api/indents/${ID}`, 'PUT', { counterchecked: 'yes' }), params);
    expect(res.status).toBe(400);
    expect(collection.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('stamps completion and computes total when newly counterchecked (with edited received time)', async () => {
    collection.findOne.mockResolvedValue({
      _id: ID, counterchecked: false, dateReceived: new Date('2026-10-16T00:00:00.000Z'), timeReceived: '10:00',
    });
    collection.findOneAndUpdate.mockResolvedValue({ _id: ID });

    const res = await PUT(
      jsonRequest(`http://test/api/indents/${ID}`, 'PUT', {
        counterchecked: true,
        dateReceived: '2026-10-16T00:00:00.000Z',
        timeReceived: '09:00',
      }),
      params
    );
    expect(res.status).toBe(200);
    // 09:00 -> 12:34 (frozen server time) = 214 minutes, from the EDITED received time.
    expect(collection.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: expect.any(ObjectId) },
      {
        $set: expect.objectContaining({
          counterchecked: true,
          timeReceived: '09:00',
          timeCompleted: '12:34',
          totalTimeMinutes: 214,
        }),
      },
      { returnDocument: 'after' }
    );
  });

  it('recomputes the total from the new received time when an already-counterchecked indent is edited', async () => {
    collection.findOne.mockResolvedValue({
      _id: ID,
      counterchecked: true,
      dateReceived: new Date('2026-10-16T00:00:00.000Z'),
      timeReceived: '10:00',
      dateCompleted: new Date('2026-10-16T00:00:00.000Z'),
      timeCompleted: '11:00',
    });
    collection.findOneAndUpdate.mockResolvedValue({ _id: ID });

    const res = await PUT(
      jsonRequest(`http://test/api/indents/${ID}`, 'PUT', {
        counterchecked: true,
        timeReceived: '09:00', // received moved 1h earlier -> total grows 60 -> 120
      }),
      params
    );
    expect(res.status).toBe(200);
    expect((collection.findOneAndUpdate.mock.calls[0][1] as { $set: { totalTimeMinutes: number } }).$set.totalTimeMinutes).toBe(120);
  });

  it('clamps the total to 0 when the received time is edited past the completion time', async () => {
    collection.findOne.mockResolvedValue({
      _id: ID,
      counterchecked: true,
      dateReceived: new Date('2026-10-16T00:00:00.000Z'),
      timeReceived: '10:00',
      dateCompleted: new Date('2026-10-16T00:00:00.000Z'),
      timeCompleted: '11:00',
    });
    collection.findOneAndUpdate.mockResolvedValue({ _id: ID });

    const res = await PUT(
      jsonRequest(`http://test/api/indents/${ID}`, 'PUT', { counterchecked: true, timeReceived: '13:00' }),
      params
    );
    expect(res.status).toBe(200);
    expect((collection.findOneAndUpdate.mock.calls[0][1] as { $set: { totalTimeMinutes: number } }).$set.totalTimeMinutes).toBe(0);
  });

  it('clears completion fields when countercheck is removed', async () => {
    collection.findOne.mockResolvedValue({ _id: ID, counterchecked: true });
    collection.findOneAndUpdate.mockResolvedValue({ _id: ID });

    const res = await PUT(jsonRequest(`http://test/api/indents/${ID}`, 'PUT', { counterchecked: false }), params);
    expect(res.status).toBe(200);
    expect(collection.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: expect.any(ObjectId) },
      {
        $set: expect.objectContaining({
          counterchecked: false,
          dateCompleted: null,
          timeCompleted: null,
          totalTimeMinutes: null,
        }),
      },
      { returnDocument: 'after' }
    );
  });

  it('rejects invalid partial fields with 400', async () => {
    const res = await PUT(jsonRequest(`http://test/api/indents/${ID}`, 'PUT', { numberOfRx: 'abc' }), params);
    expect(res.status).toBe(400);
    expect(collection.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/indents/:id', () => {
  it('returns 404 when nothing was deleted', async () => {
    collection.deleteOne.mockResolvedValue({ deletedCount: 0 });
    const res = await DELETE(jsonRequest(`http://test/api/indents/${ID}`, 'DELETE'), params);
    expect(res.status).toBe(404);
  });

  it('returns 200 on success', async () => {
    collection.deleteOne.mockResolvedValue({ deletedCount: 1 });
    const res = await DELETE(jsonRequest(`http://test/api/indents/${ID}`, 'DELETE'), params);
    expect(res.status).toBe(200);
  });

  it('rejects a malformed id with 400', async () => {
    const res = await DELETE(
      jsonRequest('http://test/api/indents/bad', 'DELETE'),
      { params: Promise.resolve({ id: 'bad' }) }
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /api/indents/trends', () => {
  it('returns the full month window with nulls for empty months', async () => {
    const now = new Date();
    collection.aggregate.mockReturnValue({
      toArray: async () => [
        { _id: { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }, totalCompleted: 4, under120: 3 },
      ],
    });

    const res = await GET_TRENDS(jsonRequest('http://test/api/indents/trends?months=12', 'GET'));
    expect(res.status).toBe(200);
    const trends = (await res.json()) as Array<{ month: number; year: number; complianceRate: number | null }>;

    expect(trends).toHaveLength(12);
    // Sequential: last entry is the current UTC month.
    const last = trends[trends.length - 1];
    expect(last.year).toBe(now.getUTCFullYear());
    expect(last.month).toBe(now.getUTCMonth() + 1);
    expect(last.complianceRate).toBe(75); // 3/4
    // Months without completed indents are explicit nulls, not skipped.
    expect(trends.slice(0, -1).every((t) => t.complianceRate === null)).toBe(true);
  });

  it('clamps the months parameter', async () => {
    collection.aggregate.mockReturnValue({ toArray: async () => [] });
    const res = await GET_TRENDS(jsonRequest('http://test/api/indents/trends?months=9999', 'GET'));
    const trends = (await res.json()) as unknown[];
    expect(trends).toHaveLength(24); // clamped to the 24-month maximum
  });
});
