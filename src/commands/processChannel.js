import { Client, GatewayIntentBits } from 'discord.js';
import { Configuration, OpenAIApi } from 'openai';
import { loadMaterials, saveMaterials } from '../utils/data.js';
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
  //
  const channelId = '1251056553050636300'; // Replace with your channel ID
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
        console.log(`Skipping already processed message: ${message.content}`);
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

  for (const material of materials) {
    if (material.messages && material.messages.length > 0) {
      try {
        const textContent = material.messages.map(msg => msg.content).join(' ');
        const { summary, keywords, description } = await summarizeAndExtractKeywords(textContent);
        material.summary = summary;
        material.keywords = keywords;
        material.description = description;
      } catch (error) {
        console.error('Error summarizing and extracting keywords:', error);
      }
    } else {
      console.warn('Skipping material with no messages:', material);
    }
  }

  saveMaterials(materials);
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

async function summarizeAndExtractKeywords(text) {
  const summaryResponse = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system', content: `Summarize the following text. Keep it short and concise, 
      but enough so it can be properly indexed and searched easily by AI. 
      Keep in mind the text refers to trading and related topics. 
      If the text contains a link to youtube video, try to summarize and derive what is in it based on the context. 
      Summary say what you can find inside, not what is in the video itself. This is summary for for searching / context purposes:` },
      { role: 'user', content: text }
    ],
    max_tokens: 150,
  });
  const summary = summaryResponse.data.choices[0].message.content.trim();

  const keywordResponse = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system', content: `Extract keywords from the following text. Maximum 10 keywords, can be less. 
      Keep in mind the text refers to trading and related topics. 
      Please keep the keywords relevant to the topic and optimize it for searching AI engine. 
      Do not use keywords "youtube", "trading".
      If the video is on anything related to psychology, please make sure to add "psychology" to keywords.
      If the video talks about any of trading indicators also please make sure to include them.
      If the material contains a link add a "video" keyword to it.
      Keywords should be listed, separated by a comma:` },
      { role: 'user', content: text }
    ],
    max_tokens: 50,
  });
  const keywords = keywordResponse.data.choices[0].message.content.trim().split(',').map(keyword => keyword.trim());

  const descriptionResponse = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system', content: `Write a 2-4 words summary of what is found in this content. If possible use only words that are used in the message itself. You can reuse them verbatim.`
      },
      { role: 'user', content: text }
    ],
    max_tokens: 50,
  });
  const description = descriptionResponse.data.choices[0].message.content.trim();

  return { summary, keywords, description };
}
