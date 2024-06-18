import { readFileSync } from 'fs';
import { resolve } from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const embeddings = JSON.parse(readFileSync(resolve('data/embeddings.json')));
const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function searchLocal(query, top_n = 10) {
  const queryEmbedding = await getEmbedding(query);

  const similarities = cosineSimilarity(embeddings, queryEmbedding);
  const topIndices = similarities
    .map((similarity, index) => ({ similarity, index }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, top_n)
    .map(item => item.index);
  console.log(topIndices)
  return topIndices;
}

async function getEmbedding(text) {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: text
    })
  });
  const result = await response.json();
  return result.data[0].embedding; // Assuming the response has the embedding in this structure
}

function cosineSimilarity(embeddings, queryEmbedding) {
  return embeddings.map(embedding => {
    const dotProduct = embedding.reduce((sum, a, i) => sum + a * queryEmbedding[i], 0);
    const normA = Math.sqrt(embedding.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(queryEmbedding.reduce((sum, a) => sum + a * a, 0));
    return dotProduct / (normA * normB);
  });
}
