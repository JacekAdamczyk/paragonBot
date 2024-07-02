import { Client, GatewayIntentBits } from 'discord.js';
import { loadMaterials, saveMaterials } from '../utils/data.js';
import { summarizeAndExtractKeywords } from '../utils/openaiUtils.js';
import { handleRateLimit } from '../utils/rateLimitHandler.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import fs from 'fs';
import { createEmbedding } from '../utils/embeddingUtils.js';
import { connectDB, insertEmbedding, embeddingExists } from '../utils/dbUtils.js'; // Ensure embeddingExists is imported

dotenv.config();
const processBot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ]
});

const LAST_MESSAGE_ID_FILE = 'lastMessageId.txt';

function loadLastMessageId() {
  return fs.existsSync(LAST_MESSAGE_ID_FILE) ? fs.readFileSync(LAST_MESSAGE_ID_FILE, 'utf-8') : null;
}

function saveLastMessageId(messageId) {
  fs.writeFileSync(LAST_MESSAGE_ID_FILE, messageId, 'utf-8');
}

async function loadProcessedMessageIds(db) {
  try {
    console.log('Loading processed message IDs...');
    const collection = db.collection('processedMessageIds');
    const docs = await collection.find().toArray();
    console.log('Processed message IDs loaded:', docs.length);
    return new Set(docs.map(doc => doc.id));
  } catch (error) {
    console.error('Error in loadProcessedMessageIds:', error);
    throw error;
  }
}

async function saveProcessedMessageIds(db, processedMessageIds) {
  console.log('Saving processed message IDs...');
  const collection = db.collection('processedMessageIds');
  await collection.deleteMany({});
  await collection.insertMany(Array.from(processedMessageIds).map(id => ({ id })));
  console.log('Processed message IDs saved.');
}

processBot.once('ready', async () => {
  console.log(`Process Bot logged in as ${processBot.user.tag}!`);

  const channelId = '1251056574156505089'; // Replace with your channel ID
  const channel = processBot.channels.cache.get(channelId);

  if (!channel) {
    console.error(`Channel with ID ${channelId} not found.`);
    process.exit(1);
  }

  let lastMessageId = loadLastMessageId();
  let lastMessageTime = null;
  const isTestMode = process.env.MODE === 'test';
  const messageLimit = isTestMode ? 100 : Infinity; // Set limit for test mode

  try {
    console.log('Connecting to the database...');
    const { db, client } = await connectDB(); // Ensure DB is connected
    console.log('Database connected, starting message processing...');

    if (!client.topology.isConnected()) {
      throw new Error('MongoDB client is not connected after attempting to connect.');
    }

    let materials = await loadMaterials();
    materials = materials.map(material => ({
      id: material.id || uuidv4(),
      ...material
    }));

    let processedMessageIds = await loadProcessedMessageIds(db);

    let currentMaterial = { id: uuidv4(), messages: [], links: [], summary: '', description: '', author: '', keywords: [], channelId };
    let messageCount = 0; // Counter to limit the number of fetched messages

    while (messageCount < messageLimit) {
      const options = { limit: 100 };
      if (lastMessageId) {
        options.before = lastMessageId;
      }

      const messages = await channel.messages.fetch(options);
      const messagesArray = Array.from(messages.values()).reverse(); // Reverse the order to process oldest first

      if (!messagesArray.length) {
        break;
      }

      for (const message of messagesArray) {
        if (processedMessageIds.has(message.id)) {
          continue;
        }

        const sanitizedContent = message.content.replace(/\*\*/g, '');

        if (isNewMaterial(message, lastMessageTime)) {
          if (currentMaterial.messages.length > 0) {
            materials.push({ ...currentMaterial });
            currentMaterial = { id: uuidv4(), messages: [], links: [], summary: '', description: '', author: '', keywords: [], channelId };
          }
        }

        if (sanitizedContent && !currentMaterial.messages.some(msg => msg.id === message.id)) {
          currentMaterial.messages.push({ id: message.id, content: sanitizedContent, timestamp: message.createdTimestamp });
          processedMessageIds.add(message.id);
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const urls = sanitizedContent.match(urlRegex);
          if (urls) {
            currentMaterial.links.push(...urls);
          }
        }

        if (message.attachments.size > 0) {
          message.attachments.forEach(attachment => {
            if (!currentMaterial.messages.some(msg => msg.id === message.id)) {
              currentMaterial.messages.push({ id: message.id, content: attachment.url, timestamp: message.createdTimestamp });
              processedMessageIds.add(message.id);
            }
          });
        }

        currentMaterial.author = message.author.globalName;

        lastMessageTime = message.createdTimestamp;
        messageCount++;
        if (messageCount >= messageLimit) break; // Stop if we've reached the limit in test mode
      }

      if (messages.size < 100 || messageCount >= messageLimit) {
        break;
      }

      lastMessageId = messages.last().id;
      saveLastMessageId(lastMessageId); // Save the last processed message ID
    }

    if (currentMaterial.messages.length > 0) {
      materials.push({ ...currentMaterial });
    }

    const processedMaterials = await processMaterials(materials);

    await saveMaterials(processedMaterials);
    await saveProcessedMessageIds(db, processedMessageIds);

    console.log('Materials processed and saved.');

    // Create embeddings for the processed materials
    for (const material of processedMaterials) {
      const document = material.summary + ' ' + material.messages.map(m => m.content).join(' ');

      const exists = await embeddingExists(db, material.id);
      if (!exists) {
        const embedding = await createEmbedding(document);
        await insertEmbedding(db, material.id, embedding);
      }
    }

    console.log('Embeddings created and saved.');
  } catch (error) {
    console.error('Error processing messages:', error);
  }

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

      await handleRateLimit(response);

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
            return handleRateLimit(error.response).then(() => processMaterials([material]));
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
