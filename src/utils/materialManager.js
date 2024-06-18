import { loadMaterials, saveMaterials } from './data.js';
import { Client, GatewayIntentBits } from 'discord.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { summarizeAndExtractKeywords } from './openaiUtils.js'; // Import the OpenAI utility functions

dotenv.config();

const processBot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ]
});

processBot.login(process.env.PROCESS_BOT_TOKEN);

function stripNonPrintableCharacters(str) {
  return str.replace(/[^\x20-\x7E]/g, '');
}

function isNewMaterial(message, lastMessageTime) {
  const fiveMinutes = 5 * 60 * 1000;
  if (lastMessageTime === null) {
    return true;
  }
  const timeDifference = message.createdTimestamp - lastMessageTime;

  return timeDifference > fiveMinutes;
}

async function fetchMessagesInRange(channel, startMessage, timeWindowMs) {
  let messagesInRange = [];
  let lastMessageIdBefore = startMessage.id;
  let hasMoreMessagessToProcess = true;

  // Fetch messages before the startMessage
  while (hasMoreMessagessToProcess) {
    const options = { limit: 10, around: lastMessageIdBefore };
    const messages = await channel.messages.fetch(options);
    console.log(messages)
    if (messages.size === 0) break;

    const messagesArray = Array.from(messages.values());

    for (const message of messagesArray) {
      const timeDifference = Math.abs(startMessage.createdTimestamp - message.createdTimestamp);
      if (timeDifference <= timeWindowMs) {
        messagesInRange.push(message);
      } else if (message.createdTimestamp < startMessage.createdTimestamp - timeWindowMs) {
        hasMoreMessagessToProcess = false;
        break;
      }
      lastMessageIdBefore = message.id;
    }

    if (messages.size < 10) hasMoreMessagessToProcess = false;
  }

  // Include the startMessage itself in the results
  messagesInRange.push(startMessage);

  // Sort the messages by timestamp
  messagesInRange.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  return messagesInRange;
}

async function processMessagesBatch(messages, materials, processedMessageIds, channelId) {
  let currentMaterial = { id: uuidv4(), messages: [], links: [], summary: '', description: '', author: '', keywords: [], channelId };
  let lastMessageTime = null;

  for (const message of messages) {
    if (processedMessageIds.has(message.id)) {
      continue;
    }

    if (isNewMaterial(message, lastMessageTime)) {
      if (currentMaterial.messages.length > 0) {
        materials.push({ ...currentMaterial });
        currentMaterial = { id: uuidv4(), messages: [], links: [], summary: '', description: '', author: '', keywords: [], channelId };
      }
    }

    if (message.content) {
      currentMaterial.messages.push({ id: message.id, content: message.content, timestamp: message.createdTimestamp });
      processedMessageIds.add(message.id);
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = message.content.match(urlRegex);
      if (urls) {
        currentMaterial.links.push(...urls);
      }
    }
    if (message.attachments.size > 0) {
      message.attachments.forEach(attachment => {
        currentMaterial.messages.push({ id: attachment.id, content: attachment.url, timestamp: message.createdTimestamp });
        processedMessageIds.add(attachment.id);
      });
    }

    // Update author information
    currentMaterial.author = message.author.globalName;
    lastMessageTime = message.createdTimestamp; // Update the last processed message time
  }

  if (currentMaterial.messages.length > 0) {
    materials.push({ ...currentMaterial });
  }
}

async function processMaterials(materials) {
  const summaries = await Promise.all(materials.map(async (material) => {
    if (material.messages && material.messages.length > 0) {
      try {
        const textContent = material.messages.map(msg => msg.content).join(' ');
        const result = await summarizeAndExtractKeywords(textContent);
        return { ...material, ...result };
      } catch (error) {
        console.error('Error summarizing and extracting keywords:', error);
        return material;
      }
    }
    return material;
  }));
  return summaries;
}

export async function processNewMessagesFromLink(messageLink) {
  const messageLinkParts = messageLink.split('/');
  const channelId = messageLinkParts[messageLinkParts.length - 2];
  const messageId = messageLinkParts[messageLinkParts.length - 1];
  const channel = await processBot.channels.fetch(channelId);
  if (!channel) {
    console.error(`Channel with ID ${channelId} not found.`);
    return;
  }

  const startMessage = await channel.messages.fetch(messageId);
  const timeWindowMs = 5 * 60 * 1000; // 5 minutes before and after

  const materials = loadMaterials();
  const processedMessageIds = new Set(materials.flatMap(material => material.messages.map(msg => msg.id)));

  // Fetch messages within the 5-minute range before and after the start message
  const messagesInRange = await fetchMessagesInRange(channel, startMessage, timeWindowMs);

  messagesInRange.push(startMessage); // Ensure the start message is included
  messagesInRange.sort((a, b) => a.createdTimestamp - b.createdTimestamp); // Sort by timestamp

  // Process messages in batches
  await processMessagesBatch(messagesInRange, materials, processedMessageIds, channelId);

  // Summarize and extract keywords for each material concurrently
  const processedMaterials = await processMaterials(materials);

  saveMaterials(processedMaterials);

  console.log('Materials processed and saved.');
}

export async function viewMaterial(messageLink) {
  const messageLinkParts = messageLink.split('/');
  const messageId = stripNonPrintableCharacters(messageLinkParts[messageLinkParts.length - 1].trim());
  const materials = loadMaterials();

  for (const material of materials) {
    for (const msg of material.messages) {
      const cleanedMsgId = stripNonPrintableCharacters(msg.id.trim());
      if (cleanedMsgId === messageId) {
        return `ID: ${material.id}\nDescription: ${material.description}\nKeywords: ${material.keywords.join(', ')}\nMessages: ${material.messages.map(msg => msg.content).join(' ')}\nAuthor: ${material.author}`;
      }
    }
  }

  return 'Material not found.';
}

export async function editMaterial(materialId, field, newValue) {
  field = field.toLowerCase();
  const materials = loadMaterials();
  const cleanedMaterialId = stripNonPrintableCharacters(materialId.trim());

  const material = materials.find(mat => {
    const materialIdTrimmed = stripNonPrintableCharacters(mat.id.trim());
    return materialIdTrimmed === cleanedMaterialId;
  });

  if (!material) {
    return 'Material not found.';
  }

  if (!['description', 'keywords', 'summary'].includes(field)) {
    return 'Invalid field. Valid fields are: description, keywords, summary.';
  }

  if (field === 'keywords') {
    material[field] = newValue.split(',').map(keyword => keyword.trim());
  } else {
    material[field] = newValue;
  }

  saveMaterials(materials);
  return 'Material updated successfully.';
}

export async function deleteMaterial(materialId) {
  const materials = loadMaterials();
  const cleanedMaterialId = stripNonPrintableCharacters(materialId.trim());

  const materialIndex = materials.findIndex(mat => {
    const materialIdTrimmed = stripNonPrintableCharacters(mat.id.trim());
    return materialIdTrimmed === cleanedMaterialId;
  });

  if (materialIndex === -1) {
    return 'Material not found.';
  }

  materials.splice(materialIndex, 1);
  saveMaterials(materials);
  return 'Material deleted successfully.';
}
