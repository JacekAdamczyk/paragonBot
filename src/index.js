import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import commandHandlers from './commandHandlers.js';
import { loadMaterials } from './utils/data.js';

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
  // Split the message content into command and arguments, ignoring multiple spaces
  const args = message.content.trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  if (commandHandlers[command]) {
    await commandHandlers[command](message, args);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
