import striptags from 'striptags';
import Parser from 'rss-parser';
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';

import { repoInsertNewsItem } from '../repo/repo.js';
import { serviceCategorizeNews, serviceRankNews, serviceExtractParticipants } from './services.js';

import { JORNAIS, EXCLUDED_CATEGORIES } from '../config/constants.js';

dotenv.config();

const parser = new Parser({
  timeout: 5000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  customFields: {
    item: [
      ['dc:creator', 'creator'],
      ['author', 'author'],
      ['category', 'categories', { keepArray: true }],
      ['enclosure', 'enclosure'], // To get the image URL (not needed now)
    ],
  },
});

async function waitForApi(maxRetries = 30, delayMs = 1000) {
  console.log('Waiting for classification API to be ready...');

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${process.env.CLUSTER_API_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        if (data.model_loaded) {
          console.log('✅ API is ready with model loaded');
          return true;
        }
      }
      console.log(`API not ready yet (attempt ${i + 1}/${maxRetries})...`);
    } catch (error) {
      console.log(`API not responding (attempt ${i + 1}/${maxRetries})...`);
    }

    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error('API failed to become ready after multiple retries');
}

export async function processNewsFeeds() {
  // Wait for API to be fully ready before processing any feeds
  await waitForApi();

  for (const jornal of Object.keys(JORNAIS)) {
    try {
      await processNewsFeed(jornal);
    } catch (error) {
      Sentry.withScope((scope) => {
        scope.setTag('jornal', jornal);
        Sentry.captureException(error);
      });
      console.error(
        `[CRITICAL] Failed to complete ${jornal}: ${error.message}`
      );
    }
  }
}

async function processNewsFeed(jornal) {
  console.log(`\n Starting to Process Jornal: ${jornal}\n`);

  const url = JORNAIS[jornal];

  const feed = await parser.parseURL(url);
  let items = feed.items.slice(0, 5);

  for (let item of items) {
    Sentry.addBreadcrumb({
      category: 'scraper',
      message: `Processing article: ${item.title}`,
      level: 'info',
    });

    try {
      let categories = item.categories;
      if (!categories) {
        categories = ['N.A'];
      } else if (!Array.isArray(categories)) {
        categories = [categories];
      }

      // Skip excluded categories
      if (categories.some((c) => EXCLUDED_CATEGORIES.includes(c))) {
        console.log(`Skipping "${item.title}" (category excluded)`);
        continue;
      }

      // Clean HTML tags
      let rawTitle = item.title || '';

      if (rawTitle.includes('<![CDATA[')) {
        rawTitle = rawTitle.replace('<![CDATA[', '').replace(']]>', '');
      }

      // If the title is an object (sometimes happens with CDATA), try to get the text
      if (typeof rawTitle === 'object' && rawTitle?._) {
        rawTitle = rawTitle._;
      }

      let cleanTitle = striptags(String(rawTitle || '')).trim();

      if (!cleanTitle || cleanTitle === 'undefined') {
        console.log(
          `Skipping item: Empty title detected. Raw was:`,
          item.title
        );
        continue;
      }

      let cleanSummary = item.contentSnippet
        ? striptags(item.contentSnippet)
        : '';

      if (!cleanTitle) {
        console.log(`Skipping item: Empty title detected.`);
        continue;
      }

      // Check if the last character is not a period, then add "..."
      if (
        cleanSummary.charAt(cleanSummary.length - 1) !== '.' &&
        cleanSummary.length > 0
      ) {
        cleanSummary += '...';
      }

      // Author clean
      let authorRaw = item['dc:creator'] || item.creator || item.author || '';

      // If it's an array, grab the first string inside it
      if (Array.isArray(authorRaw)) authorRaw = authorRaw[0];

      // If it's an object, try to find the text property (_), otherwise force it to empty string
      if (typeof authorRaw === 'object' && authorRaw !== null) {
        authorRaw = authorRaw._ || '';
      }

      let author = String(authorRaw || '').trim();

      if (!author || author.includes('@')) {
        author = jornal;
      }

      // Build DB-friendly object
      let newsItem = {
        site_name: jornal,
        link: item.link,
        title: cleanTitle,
        date: item.pubDate ? new Date(item.pubDate) : new Date(),
        categories: categories,
        summary: cleanSummary,
        author: author,
      };

      const cleanedNewsItem = {
        title: newsItem.title,
        summary: newsItem.summary,
      };

      // 1. Categorize using LLM
      let categorizeResult = await serviceCategorizeNews(cleanedNewsItem);
      if (!categorizeResult.success) {
        console.log(
          `LLM categorization failed for "${item.title}": ${categorizeResult.error}`
        );
        newsItem.topics = [{ name: 'Outro', rank: 1 }];
      } else {
        console.log(`LLM categorization result:`, categorizeResult.topics);
        newsItem.topics = categorizeResult.topics;
      }

      // 2. Score news importance using LLM
      const scoreResult = await serviceRankNews(cleanedNewsItem);
      if (!scoreResult.success) {
        console.log(`LLM scoring failed for "${item.title}"`);
        newsItem.score = null; // Default score when LLM fails
      } else {
        console.log(`LLM scoring result:`, scoreResult.scores);
        newsItem.score = scoreResult.scores;
      }

      // 3. Extract participants using LLM
      const extractionResult = await serviceExtractParticipants(cleanedNewsItem, newsItem);
      if (!extractionResult.success) {
        console.log(`LLM participant extraction failed for "${item.title}"`);
        newsItem.participant_ids = [];
      } else {
        console.log(`LLM participant extraction successful. Found: ${extractionResult.names}.`);
        newsItem.participant_ids = extractionResult.participants;
      }

      console.log(newsItem);

      // 3. Save or update in DB
      let result = await repoInsertNewsItem(newsItem);
      console.log(`Saved: ${item.title}`, result);

      // 4. Index into OpenSearch via Python API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5-minute timeout for first request (model warm-up)
      const indexResponse = await fetch(
        `${process.env.CLUSTER_API_URL}/index_summary`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            id: result?._id ? result._id.toString() : `news_${Date.now()}`,
            text: newsItem.title + '\n\n' + newsItem.summary,
            topic: Array.isArray(newsItem.topics) && newsItem.topics.length > 0
              ? newsItem.topics[0].name
              : 'Outro',
            url: newsItem.link || '',
            original_summary: newsItem.summary || '',
            publishedAt: newsItem.date.toISOString(),
            title: newsItem.title || '',
          }),
        }
      );
      clearTimeout(timeoutId);
      if (!indexResponse.ok) {
        console.error(
          '[PARSER] Failed to index to OpenSearch:',
          await indexResponse.text()
        );
      } else {
        console.log(`[PARSER] Successfully indexed article to OpenSearch.`);
      }
    } catch (itemError) {
      Sentry.captureException(itemError);
      console.error(`[ITEM ERROR] Skipping ${jornal}:`, itemError.message);
    }
  }
}
