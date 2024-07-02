import { connectDB } from './db.js';

export async function withDB(action) {
  const { db } = await connectDB();
  if (!db) {
    console.error('Database connection is not established.');
    throw new Error('Database connection is not established.');
  }
  try {
    return await action(db);
  } catch (error) {
    console.error('Error during DB operation:', error);
    throw error;
  }
}

export async function insertEmbedding(db, materialId, embedding) {
  const embeddingsCollection = db.collection('embeddings');
  return embeddingsCollection.insertOne({
    materialId,
    embedding
  });
}

export async function updateEmbedding(db, materialId, embedding) {
  const embeddingsCollection = db.collection('embeddings');
  return embeddingsCollection.updateOne(
    { materialId },
    { $set: { embedding } }
  );
}

export async function deleteEmbedding(db, materialId) {
  const embeddingsCollection = db.collection('embeddings');
  return embeddingsCollection.deleteOne({ materialId });
}

export async function getMaterial(db, materialId) {
  const materialsCollection = db.collection('materials');
  return materialsCollection.findOne({ _id: materialId });
}

export async function embeddingExists(db, materialId) {
  const embeddingsCollection = db.collection('embeddings');
  const result = await embeddingsCollection.findOne({ materialId });
  return result != null;
}

export { connectDB };
