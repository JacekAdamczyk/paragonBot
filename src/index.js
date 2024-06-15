import { Client, GatewayIntentBits } from 'discord.js';
import { findEducationalMaterial } from './commands/find.js';
import { loadMaterials } from './utils/data.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  loadMaterials();
});

client.on('messageCreate', async message => {
  if (message.content.startsWith('!find')) {
    const query = message.content.slice(6).trim();
    const response = await findEducationalMaterial(query);
    message.reply(response);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
