import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { connectDB } from '../src/utils/db.js';

dotenv.config();

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function createEmbeddings() {
  const { db, client } = await connectDB();
  if (!db) {
    console.error('Database connection is not established.');
    return;
  }

  const materialsCollection = db.collection('materials');
  const embeddingsCollection = db.collection('embeddings');

  const materials = await materialsCollection.find().toArray();
  if (!materials.length) {
    console.error('No materials found in the database.');
    return;
  }

  const documents = materials.map(material => material.summary + ' ' + material.messages.map(m => m.content).join(' '));

  const embeddings = await Promise.all(documents.map(async (document, index) => {
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
        console.log(`Successfully fetched embedding for document ${index + 1}`);
        return result.data[0].embedding;
      } else {
        console.error('Unexpected response structure for document:', index + 1, result);
        return null;
      }
    } catch (error) {
      console.error('Error fetching embedding for document:', index + 1, error);
      return null;
    }
  }));

  const validEmbeddings = embeddings.filter(embedding => embedding !== null);

  if (validEmbeddings.length === 0) {
    console.error('No valid embeddings were created.');
    await client.close();
    return;
  }

  await embeddingsCollection.deleteMany({});
  await embeddingsCollection.insertMany(
    validEmbeddings.map((embedding, index) => ({
      materialId: materials[index]._id,
      embedding
    }))
  );

  console.log('Embeddings created and saved successfully.');
  await client.close();
}

createEmbeddings().catch(async (error) => {
  console.error('Error creating embeddings:', error);
  const { client } = await connectDB();
  await client.close();
});
