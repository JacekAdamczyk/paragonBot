import { getMaterials } from '../utils/data.js';
import { filterMaterialsWithOpenAI } from '../utils/openai.js';

export async function findEducationalMaterial(query) {
  const materials = getMaterials();
  const filteredMaterials = await filterMaterialsWithOpenAI(query, materials);

  if (filteredMaterials.length === 0) {
    return 'No relevant materials found.';
  }

  // Limit the number of results to prevent spam (optional)
  const maxResults = 5;
  const limitedResults = filteredMaterials.slice(0, maxResults);

  return limitedResults.map(material =>
    `**${material.description}:**\nLink: https://discord.com/channels/871005518662078514/${material.channelId}/${material.messages[0].id}`
  ).join('\n\n') + (filteredMaterials.length > maxResults ? '\n\nMore results available...' : '');
}
