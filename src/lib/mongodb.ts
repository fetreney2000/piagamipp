import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI!;
const options = {
  maxPoolSize: 1,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 30000,
  retryWrites: false,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  const globalWithMongo = global as typeof globalThis & { _mongoClientPromise?: Promise<MongoClient> };
  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function getDatabase() {
  const client = await clientPromise;
  return client.db('piagamipp');
}

export async function ensureIndexes() {
  try {
    const db = await getDatabase();
    await Promise.all([
      db.collection('indents').createIndex({ dateReceived: -1 }),
      db.collection('indents').createIndex({ counterchecked: 1, dateReceived: -1 }),
      db.collection('indents').createIndex({ type: 1, dateReceived: -1 }),
      db.collection('indents').createIndex({ wardName: 1, dateReceived: -1 }),
      db.collection('indents').createIndex({ totalTimeMinutes: 1 }),
      db.collection('wards').createIndex({ name: 1 }, { unique: true }),
    ]);
  } catch {
    // Index creation is best-effort; indexes may already exist
  }
}

ensureIndexes();
