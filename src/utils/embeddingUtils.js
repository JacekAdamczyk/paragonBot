import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { connectDB } from './dbUtils.js';

dotenv.config();

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function createEmbedding(document) {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: document
      })
    });

    const result = await response.json();

    if (response.ok && result.data && result.data[0] && result.data[0].embedding) {
      return result.data[0].embedding;
    } else {
      console.error('Unexpected response structure:', result);
      throw new Error('Failed to retrieve embedding');
    }
  } catch (error) {
    console.error('Error fetching embedding:', error);
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

export async function embeddingExists(db, materialId) {
  const embeddingsCollection = db.collection('embeddings');
  const result = await embeddingsCollection.findOne({ materialId });
  return result != null;
}
