import { loadMaterials } from '../utils/data.js';
import { filterMaterialsWithOpenAI } from '../utils/openai.js';
import { searchLocal } from '../utils/localSearch.js';

export async function findEducationalMaterial(query) {
  const materials = loadMaterials();

  // Perform local semantic search
  const topIndices = await searchLocal(query);
  const filteredMaterials = topIndices.map(index => materials[index]);

  // Filter materials with OpenAI
  const finalMaterials = await filterMaterialsWithOpenAI(query, filteredMaterials);

  if (finalMaterials.length === 0) {
    return 'No relevant materials found.';
  }

  // Limit the number of results to prevent spam (optional)
  const maxResults = 5;
  const limitedResults = finalMaterials.slice(0, maxResults);

  return limitedResults.map(material =>
    `**${material.description}:**\nLink: https://discord.com/channels/871005518662078514/${material.channelId}/${material.messages[0].id}`
  ).join('\n\n') + (finalMaterials.length > maxResults ? '\n\nMore results available...' : '');
}
