import { connectDB } from './db.js';

export async function loadMaterials() {
  const { db } = await connectDB();
  const materials = await db.collection('materials').find().toArray();
  return materials;
}

export async function saveMaterials(materials) {
  const { db } = await connectDB();
  await db.collection('materials').deleteMany({});
  await db.collection('materials').insertMany(materials);
}

export async function loadFeedback() {
  const { db } = await connectDB();
  const feedback = await db.collection('feedback').find().toArray();
  return feedback;
}

export async function saveFeedback(feedback) {
  const { db } = await connectDB();
  await db.collection('feedback').deleteMany({});
  await db.collection('feedback').insertMany(feedback);
}
