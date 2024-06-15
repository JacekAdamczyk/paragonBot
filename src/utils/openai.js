import { Configuration, OpenAIApi } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export async function filterMaterialsWithOpenAI(query, materials) {
  const prompt = `
    Given the following list of educational materials, provide the ones that best match the query: "${query}"

    Each material is described with an ID, summary, content, keywords, and author.

    Materials:
    ${materials.map(material => `ID: ${material.id}\nSummary: ${material.summary}\nContent: ${material.messages.map(m => m.content).join(' ')}\nKeywords: ${material.keywords.join(', ')}\nAuthor: ${material.author}`).join('\n\n')}

    Query: "${query}"

    Please list the IDs of the most relevant materials.
  `;

  const response = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 300,
  });

  const resultText = response.data.choices[0].message.content.trim();
  console.log('resultText');
  console.log(resultText);

  // Extract material IDs from the response
  const idMatches = resultText.match(/\b[a-f0-9\-]{36}\b/g); // Match UUID format
  const matchedIds = idMatches ? [...new Set(idMatches)] : [];
  console.log('matchedIds');
  console.log(matchedIds);

  // Find matching materials based on material IDs
  const matchedMaterials = materials.filter(material =>
    matchedIds.includes(material.id)
  );
  console.log('matchedMaterials');
  console.log(matchedMaterials);

  return matchedMaterials;
}
