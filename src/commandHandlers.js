import { findEducationalMaterial } from './commands/find.js';
import { processNewMessagesFromLink, editMaterial, viewMaterial, deleteMaterial } from './utils/materialManager.js';
import { loadFeedback, saveFeedback } from './utils/data.js';
import helpText from './help.js';
import helpAdminText from './helpAdmin.js';
import { isAdmin } from './utils/checkAdmin.js';
import { withDB } from './utils/dbUtils.js';
import { createEmbedding, insertEmbedding, deleteEmbedding } from './utils/embeddingUtils.js';

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

    await withDB(async (db) => {
      const feedbackData = await loadFeedback(db);
      const userFeedback = feedbackData.find(fb => fb.userId === message.author.id && fb.feedback === null);
      if (userFeedback) {
        userFeedback.feedback = feedbackType;
        if (feedbackType === 'no' && detailedFeedback) {
          userFeedback.detailedFeedback = detailedFeedback;
        }
        await saveFeedback(db, feedbackData);
        message.reply('Thank you for your feedback!');
      } else {
        message.reply('No recent search found to provide feedback for.');
      }
    });
  },
  '!reviewfeedback': async (message) => {
    if (!isAdmin(message.author.id)) {
      return message.reply('You do not have permission to use this command.');
    }

    await withDB(async (db) => {
      const feedbackData = await loadFeedback(db);
      const unreviewedFeedback = feedbackData.filter(fb => fb.feedback);

      if (unreviewedFeedback.length === 0) {
        return message.reply('No feedback to review.');
      }

      let feedbackText = unreviewedFeedback.map((fb, index) =>
        `**Feedback #${index + 1}**\n**User:** ${fb.username}\n**Query:** ${fb.query}\n**Resulting material:**\n${fb.materials.join('\n')}\n**Feedback:** ${fb.feedback}\n${fb.detailedFeedback ? `**Details:** ${fb.detailedFeedback}` : ''}\n**ID:** ${fb.id}\n`
      ).join('\n');

      if (feedbackText.length > 2000) {
        feedbackText = feedbackText.substring(0, 1980) + '\n ...and more';
      }

      message.reply(feedbackText);
    });
  },
  '!clearfeedback': async (message) => {
    if (!isAdmin(message.author.id)) {
      return message.reply('You do not have permission to use this command.');
    }

    await withDB(async (db) => {
      await saveFeedback(db, []);
      message.reply('All feedback has been cleared.');
    });
  },
  '!deletefeedback': async (message, args) => {
    if (!isAdmin(message.author.id)) {
      return message.reply('You do not have permission to use this command.');
    }
    const feedbackId = args[0];
    if (!feedbackId) {
      return message.reply('Please provide a valid feedback ID.');
    }

    await withDB(async (db) => {
      const feedbackData = await loadFeedback(db);
      const feedbackIndex = feedbackData.findIndex(fb => fb.id === feedbackId);

      if (feedbackIndex !== -1) {
        feedbackData.splice(feedbackIndex, 1);
        await saveFeedback(db, feedbackData);
        message.reply('Feedback has been deleted.');
      } else {
        message.reply('Feedback ID not found.');
      }
    });
  },
  '!add': async (message, args) => {
    if (!isAdmin(message.author.id)) {
      return message.reply('You do not have permission to use this command.');
    }
    const messageLink = args[0];
    if (messageLink) {
      await withDB(async (db) => {
        const newMaterial = await processNewMessagesFromLink(messageLink);
        if (newMaterial) {
          const document = newMaterial.summary + ' ' + newMaterial.messages.map(m => m.content).join(' ');
          const embedding = await createEmbedding(document);
          await insertEmbedding(db, newMaterial.id, embedding);
          message.reply('New material processed and added with embedding.');
        } else {
          message.reply('Failed to process new material.');
        }
      });
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
      await withDB(async (db) => {
        const result = await editMaterial(materialId, field, newValue);
        const material = await getMaterial(db, materialId);
        const document = material.summary + ' ' + material.messages.map(m => m.content).join(' ');
        const embedding = await createEmbedding(document);
        await updateEmbedding(db, materialId, embedding);
        message.reply(result);
      });
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
    //TODO HANDLE BIG MESSAGES
  },
  '!delete': async (message, args) => {
    if (!isAdmin(message.author.id)) {
      return message.reply('You do not have permission to use this command.');
    }
    const materialId = args[0];
    if (materialId) {
      await withDB(async (db) => {
        try {
          const result = await deleteMaterial(materialId);
          await deleteEmbedding(db, materialId);
          message.reply(result);
        } catch (error) {
          console.error('Error during DB operation:', error);
          message.reply('An error occurred while deleting the material.');
        }
      });
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
