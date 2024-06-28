import { loadMaterials, loadFeedback, saveFeedback } from '../utils/data.js';
import { filterMaterialsWithOpenAI } from '../utils/openai.js';
import { searchLocal } from '../utils/localSearch.js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

export async function findEducationalMaterial(query, userId, username) {
  const materials = loadMaterials();

  const topIndices = await searchLocal(query);
  const filteredMaterials = topIndices.map(index => materials[index]);

  const finalMaterials = await filterMaterialsWithOpenAI(query, filteredMaterials);

  if (finalMaterials.length === 0) {
    return 'No relevant materials found.';
  }

  const maxResults = 5;
  const limitedResults = finalMaterials.slice(0, maxResults);

  let resultText = limitedResults.map(material =>
    `**${material.description}:**\nSummary: ${material.summary}\nLink: https://discord.com/channels/${process.env.GUILD_ID}/${material.channelId}/${material.messages[0].id}`
  ).join('\n\n') + (finalMaterials.length > maxResults ? '\n\nMore results available...' : '');


  if (resultText.length > 2000) {
    resultText = resultText.substring(0, 1997) + '...';
  }

  const feedbackData = loadFeedback();

  const newFeedbackData = feedbackData.filter(fb => fb.userId !== userId || fb.feedback !== null);

  const materialLinks = limitedResults.map(material =>
    `https://discord.com/channels/${process.env.GUILD_ID}/${material.channelId}/${material.messages[0].id}`
  );

  newFeedbackData.push({ id: uuidv4(), userId, username, query, materials: materialLinks, timestamp: new Date().toISOString(), feedback: null, detailedFeedback: null, reviewed: false });
  saveFeedback(newFeedbackData);

  return `${resultText}\n\nWas this helpful? Reply with \`!feedback yes\` or \`!feedback no <tell us what you were looking for>\``;
}
