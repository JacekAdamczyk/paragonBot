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
    return result.data[0].embedding; // Assuming the response has the embedding in this structure
  }));

  // Save embeddings
  writeFileSync(embeddingsFilePath, JSON.stringify(embeddings));
}

createEmbeddings().catch(console.error);
