import { findEducationalMaterial } from './commands/find.js';
import { processNewMessagesFromLink, editMaterial, viewMaterial, deleteMaterial } from './utils/materialManager.js';
import { loadFeedback, saveFeedback } from './utils/data.js';
import helpText from './help.js';
import helpAdminText from './helpAdmin.js';
import { isAdmin } from './utils/checkAdmin.js';

const commandHandlers = {
  '!bot': async (message, args) => {
    const query = args.join(' ').trim();
    const response = await findEducationalMaterial(query, message.author.id, message.author.username);
    message.reply(`Here are some materials I think you might find helpful:\n${response}`);
  },
  '!feedback': async (message, args) => {
    const feedbackType = args.shift();
    const detailedFeedback = args.join(' ').trim();

    if (feedbackType !== 'yes' && feedbackType !== 'no') {
      return message.reply('Please reply with `!feedback yes` or `!feedback no <tell us what you were looking for>`.');
    }

    const feedbackData = loadFeedback();
    const userFeedback = feedbackData.find(fb => fb.userId === message.author.id && fb.feedback === null);
    if (userFeedback) {
      userFeedback.feedback = feedbackType;
      if (feedbackType === 'no' && detailedFeedback) {
        userFeedback.detailedFeedback = detailedFeedback;
      }
      saveFeedback(feedbackData);
      message.reply('Thank you for your feedback!');
    } else {
      message.reply('No recent search found to provide feedback for.');
    }
  },
  '!reviewfeedback': (message) => {
    if (!isAdmin(message.author.id)) {
      return message.reply('You do not have permission to use this command.');
    }
    const feedbackData = loadFeedback();
    const unreviewedFeedback = feedbackData.filter(fb => fb.feedback);

    if (unreviewedFeedback.length === 0) {
      return message.reply('No feedback to review.');
    }

    const feedbackText = unreviewedFeedback.map((fb, index) =>
      `**Feedback #${index + 1}**\n**User:** ${fb.username}\n**Query:** ${fb.query}\n**Resulting material:**\n${fb.materials.join('\n')}\n**Feedback:** ${fb.feedback}\n${fb.detailedFeedback ? `**Details:** ${fb.detailedFeedback}` : ''}\n`
    ).join('\n');

    message.reply(feedbackText);
  },
  '!clearfeedback': (message) => {
    if (!isAdmin(message.author.id)) {
      return message.reply('You do not have permission to use this command.');
    }

    // Clear all feedback
    saveFeedback([]);
    message.reply('All feedback has been cleared.');
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
