import { Client, GatewayIntentBits } from 'discord.js';
import { loadMaterials, saveMaterials } from '../utils/data.js';
import { summarizeAndExtractKeywords } from '../utils/openaiUtils.js';
import { handleRateLimit } from '../utils/rateLimitHandler.js'; // Import rate limit handler
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

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
  const channelId = '1251798559469211681'; // Replace with your channel ID
  const channel = processBot.channels.cache.get(channelId);
  let lastMessageId;
  let lastMessageTime = null; // Initialize lastMessageTime

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

      currentMaterial.author = message.author.globalName;

      lastMessageTime = message.createdTimestamp; // Update lastMessageTime
    });

    if (messages.size < 100) {
      break;
    }
    lastMessageId = messages.last().id;
  }

  if (currentMaterial.messages.length > 0) {
    materials.push({ ...currentMaterial });
  }

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

async function fetchMessagesWithRateLimit(channel, options) {
  let allMessages = [];
  let lastMessageId = options.before;

  while (true) {
    if (lastMessageId) {
      options.before = lastMessageId;
    }

    try {
      const response = await channel.messages.fetch(options);
      if (response.size === 0) break;

      const messagesArray = Array.from(response.values()).reverse();
      allMessages = allMessages.concat(messagesArray);

      lastMessageId = response.last().id;

      if (response.size < 100) break;

      // Check and handle rate limit headers
      await handleRateLimit(response);

      // Pause to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      if (error.response && error.response.status === 429) {
        await handleRateLimit(error.response);
      } else {
        throw error;
      }
    }
  }

  return allMessages;
}

async function processMaterials(materials) {
  const MAX_CONCURRENT_REQUESTS = 5;
  let results = [];
  let activePromises = [];

  for (const material of materials) {
    if (material.messages && material.messages.length > 0) {
      const textContent = material.messages.map(msg => msg.content).join(' ');

      const promise = summarizeAndExtractKeywords(textContent)
        .then(result => ({ ...material, ...result }))
        .catch(error => {
          if (error.response && error.response.status === 429) {
            return handleRateLimit(error.response).then(() => processMaterials([material])); // Retry the same material after rate limit
          }
          console.error('Error summarizing and extracting keywords:', error);
          return material;
        });

      activePromises.push(promise);

      if (activePromises.length >= MAX_CONCURRENT_REQUESTS) {
        results = results.concat(await Promise.all(activePromises));
        activePromises = [];
      }
    }
  }

  if (activePromises.length > 0) {
    results = results.concat(await Promise.all(activePromises));
  }

  return results;
}
