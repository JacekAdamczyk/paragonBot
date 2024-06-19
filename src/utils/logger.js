import { appendFile } from 'fs';
import { format } from 'date-fns';

const logFilePath = './bot.log';

export function logCommand(message, command, args) {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  const logMessage = `${timestamp} - ${message.author.tag} executed ${command} with args: ${args.join(' ')}\n`;
  appendFile(logFilePath, logMessage, (err) => {
    if (err) console.error('Failed to write to log file:', err);
  });
}
