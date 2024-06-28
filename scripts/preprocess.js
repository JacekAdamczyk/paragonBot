import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const materialsFilePath = resolve('data', 'materials.json');
const embeddingsFilePath = resolve('data', 'embeddings.json');
const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function createEmbeddings() {
  if (!existsSync(materialsFilePath)) {
    console.error('materials.json file not found.');
    return;
  }

  const materials = JSON.parse(readFileSync(materialsFilePath));
  const documents = materials.map(material => material.summary + ' ' + material.messages.map(m => m.content).join(' '));

  const embeddings = await Promise.all(documents.map(async (document) => {
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
  }));

  // Save embeddings
  writeFileSync(embeddingsFilePath, JSON.stringify(embeddings));
}

createEmbeddings().catch(console.error);
