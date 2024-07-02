import { connectDB } from './db.js';

export async function loadMaterials() {
  const { db } = await connectDB();
  return await db.collection('materials').find().toArray();
}

export async function saveMaterials(materials) {
  const { db } = await connectDB();
  const collection = db.collection('materials');
  await collection.deleteMany({});
  await collection.insertMany(materials);
}

export async function loadFeedback() {
  const { db, client } = await connectDB();
  const feedback = await db.collection('feedback').find().toArray();
  await client.close();
  return feedback;
}

export async function saveFeedback(feedback) {
  const { db, client } = await connectDB();
  const collection = db.collection('feedback');
  await collection.deleteMany({});
  await collection.insertMany(feedback);
  await client.close();
}
