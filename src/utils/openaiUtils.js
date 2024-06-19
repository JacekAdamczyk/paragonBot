import { Configuration, OpenAIApi } from 'openai';
import dotenv from 'dotenv';
import importantTerms from './importantTerms.js';
import { handleRateLimit } from './rateLimitHandler.js';

dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

function formatImportantTerms(terms) {
  return Object.entries(terms).map(([term, explanation]) => `${term}: ${explanation}`).join('\n');
}

export async function summarizeAndExtractKeywords(text) {
  const importantTermsText = formatImportantTerms(importantTerms);

  try {
    const summaryResponse = await openai.createChatCompletion({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system', content: `You are an assistant that summarizes trading-related content for indexing and search purposes. 
          Your summaries should be concise but informative enough to understand the main points and context. 
          The following terms are important and their meanings should be taken into account:
          ${importantTermsText}
          Consider the following examples:
          Example 1: "A detailed analysis of market trends and trading strategies."
          Example 2: "Insights on the psychological aspects of trading and risk management."
          Summarize the following text accordingly:`
        },
        { role: 'user', content: text }
      ],
      max_tokens: 150,
    });

    const summary = summaryResponse.data.choices[0].message.content.trim();

    const keywordResponse = await openai.createChatCompletion({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system', content: `
          You are an assistant that extracts keywords for trading-related content to optimize search indexing, semantic search, AI search. 
          Extract relevant keywords, including synonyms and related terms, to enhance searchability. 
          The following terms are important and their meanings should be taken into account:
          ${importantTermsText}
          Exclude generic terms like "youtube", "trading", "investing", "finance", "cryptocurrencies"
          Consider the following examples for guidance:
          Example 1: "market trends, trading strategies, risk management, psychology, analysis, video"
          Example 2: "technical analysis, emotional control, weekend price action, spot play, EMAs, order blocks"
          Example 3: "psychology, motivation, wellbeing, longevity"
          Example 4: "vwap, scalping, liquidations, composite framework, heatmaps, liquidity"
          Extract keywords from the following text.
          Keywords should be listed, separated by a comma, maximum 12 keywords:`
        },
        { role: 'user', content: text }
      ],
      max_tokens: 50,
    });

    const keywords = keywordResponse.data.choices[0].message.content.trim().split(',').map(keyword => keyword.trim());

    const descriptionResponse = await openai.createChatCompletion({
      model: 'gpt-4o',
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
  } catch (error) {
    if (error.response && error.response.status === 429) {
      await handleRateLimit(error.response);
      return summarizeAndExtractKeywords(text); // Retry after rate limit
    } else {
      console.error('Error summarizing and extracting keywords:', error);
      throw error;
    }
  }
}
