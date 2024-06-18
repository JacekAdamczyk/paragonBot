// commandHandlers.js
import { findEducationalMaterial } from './commands/find.js';
import { processNewMessagesFromLink, editMaterial, viewMaterial, deleteMaterial } from './utils/materialManager.js';
import helpText from './help.js';
import helpAdminText from './helpAdmin.js';
import { isAdmin } from './utils/checkAdmin.js';

const commandHandlers = {
  '!bot': async (message, args) => {
    const query = args.join(' ').trim();
    const response = await findEducationalMaterial(query);
    message.reply(`Here are some materials I think you might find helpful:\n${response}`);
  },
  '!add': async (message, args) => {
    if (!isAdmin(message.author.id)) {
      return message.reply('You do not have permission to use this command.');
    }
    const messageLink = args[0];
    if (messageLink) {
      await processNewMessagesFromLink(messageLink);
      message.reply('New material processed and added.');
    } else {
      message.reply('Please provide a valid message link.');
    }
  },
  '!edit': async (message, args) => {
    if (!isAdmin(message.author.id)) {
      return message.reply('You do not have permission to use this command.');
    }
    const [materialId, field, ...valueParts] = args;
    const newValue = valueParts.join(' ');
    if (materialId && field && newValue) {
      const result = await editMaterial(materialId, field, newValue);
      message.reply(result);
    } else {
      message.reply('Please provide a valid material ID, field, and new value.');
    }
  },
  '!view': async (message, args) => {
    if (!isAdmin(message.author.id)) {
      return message.reply('You do not have permission to use this command.');
    }
    const messageLink = args[0];
    if (messageLink) {
      const material = await viewMaterial(messageLink);
      message.reply(material);
    } else {
      message.reply('Please provide a valid message link.');
    }
  },
  '!delete': async (message, args) => {
    if (!isAdmin(message.author.id)) {
      return message.reply('You do not have permission to use this command.');
    }
    const materialId = args[0];
    if (materialId) {
      const result = await deleteMaterial(materialId);
      message.reply(result);
    } else {
      message.reply('Please provide a valid material ID.');
    }
  },
  '!admin': (message) => {
    if (!isAdmin(message.author.id)) {
      return message.reply('You do not have permission to use this command.');
    }
    message.reply(helpAdminText);
  },
  '!help': (message) => {
    message.reply(helpText);
  }
};

export default commandHandlers;
