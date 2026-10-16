import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

vi.mock('@/lib/mongodb', () => ({
  getDatabase: vi.fn(),
  ensureIndexes: vi.fn(),
}));

import { POST } from '@/app/api/wards/route';
import { PUT } from '@/app/api/wards/[id]/route';
import { getDatabase } from '@/lib/mongodb';

const collection = {
  findOne: vi.fn(),
  insertOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  deleteOne: vi.fn(),
};
const db = { collection: () => collection };
const ID = new ObjectId().toHexString();
const params = { params: Promise.resolve({ id: ID }) };

function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (getDatabase as Mock).mockResolvedValue(db);
});

describe('POST /api/wards', () => {
  it('rejects an empty name with 400', async () => {
    const res = await POST(jsonRequest('http://test/api/wards', 'POST', { name: '   ' }));
    expect(res.status).toBe(400);
    expect(collection.insertOne).not.toHaveBeenCalled();
  });

  it('rejects a missing name with 400', async () => {
    const res = await POST(jsonRequest('http://test/api/wards', 'POST', {}));
    expect(res.status).toBe(400);
  });

  it('trims the name before storing', async () => {
    collection.findOne.mockResolvedValue(null);
    collection.insertOne.mockResolvedValue({ insertedId: ID });

    const res = await POST(jsonRequest('http://test/api/wards', 'POST', { name: '  Ward A  ' }));
    expect(res.status).toBe(201);
    expect(collection.findOne).toHaveBeenCalledWith({ name: 'Ward A' });
    expect(collection.insertOne).toHaveBeenCalledWith({ name: 'Ward A' });
  });

  it('returns 409 for a duplicate (post-trim) name', async () => {
    collection.findOne.mockResolvedValue({ _id: ID, name: 'Ward A' });

    const res = await POST(jsonRequest('http://test/api/wards', 'POST', { name: 'Ward A' }));
    expect(res.status).toBe(409);
    expect(collection.insertOne).not.toHaveBeenCalled();
  });
});

describe('PUT /api/wards/:id', () => {
  it('rejects a malformed id with 400', async () => {
    const res = await PUT(
      jsonRequest('http://test/api/wards/bad', 'PUT', { name: 'X' }),
      { params: Promise.resolve({ id: 'bad' }) }
    );
    expect(res.status).toBe(400);
  });

  it('rejects an empty name with 400', async () => {
    const res = await PUT(jsonRequest(`http://test/api/wards/${ID}`, 'PUT', { name: '  ' }), params);
    expect(res.status).toBe(400);
    expect(collection.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('stores the trimmed name', async () => {
    collection.findOne.mockResolvedValue(null);
    collection.findOneAndUpdate.mockResolvedValue({ _id: ID, name: 'Ward B' });

    const res = await PUT(jsonRequest(`http://test/api/wards/${ID}`, 'PUT', { name: ' Ward B ' }), params);
    expect(res.status).toBe(200);
    expect(collection.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: expect.any(ObjectId) },
      { $set: { name: 'Ward B' } },
      { returnDocument: 'after' }
    );
  });

  it('returns 409 when another ward already uses the name', async () => {
    collection.findOne.mockResolvedValue({ _id: new ObjectId(), name: 'Ward B' });

    const res = await PUT(jsonRequest(`http://test/api/wards/${ID}`, 'PUT', { name: 'Ward B' }), params);
    expect(res.status).toBe(409);
  });
});
