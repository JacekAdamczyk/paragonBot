import { Client, GatewayIntentBits } from 'discord.js';
import { Configuration, OpenAIApi } from 'openai';
import { loadMaterials, saveMaterials } from '../utils/data.js';
import { summarizeAndExtractKeywords } from '../utils/openaiUtils.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const processBot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ]
});

processBot.once('ready', async () => {
  console.log(`Process Bot logged in as ${processBot.user.tag}!`);
  //1251056574156505089
  //1251056553050636300
  //1251798559469211681
  const channelId = '1251056574156505089'; // Replace with your channel ID
  const channel = processBot.channels.cache.get(channelId);
  let lastMessageId;
  let lastMessageTime = null;

  const materials = loadMaterials().map(material => ({
    id: material.id || uuidv4(),
    ...material
  }));

  let currentMaterial = { id: uuidv4(), messages: [], links: [], summary: '', description: '', author: '', keywords: [], channelId };
  const processedMessageIds = new Set(materials.flatMap(material => material.messages.map(msg => msg.id)));

  while (true) {
    const options = { limit: 100 };
    if (lastMessageId) {
      options.before = lastMessageId;
    }

    const messages = await channel.messages.fetch(options);
    const messagesArray = Array.from(messages.values()).reverse(); // Reverse the order to process oldest first
    messagesArray.forEach(message => {
      if (processedMessageIds.has(message.id)) {
        return;
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

      lastMessageTime = message.createdTimestamp;
    });

    if (messages.size < 100) {
      break;
    }
    lastMessageId = messages.last().id;
  }

  if (currentMaterial.messages.length > 0) {
    materials.push({ ...currentMaterial });
  }

  // Summarize and extract keywords for each material concurrently
  const processedMaterials = await processMaterials(materials);

  saveMaterials(processedMaterials);

  console.log('Materials processed and saved.');
  process.exit(0);
});

processBot.login(process.env.PROCESS_BOT_TOKEN);

function isNewMaterial(message, lastMessageTime) {
  const fiveMinutes = 5 * 60 * 1000;
  if (lastMessageTime === null) {
    return true;
  }
  const timeDifference = message.createdTimestamp - lastMessageTime;

  return timeDifference > fiveMinutes;
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
