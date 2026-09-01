import {
  repoGetDailyNews,
  repoGetDailySummary,
  repoGetWeeklySummary,
  repoGetSubjects,
  repoGetNewsBySubject,
  repoGetThemes,
  repoGetSubjectsByIds,
  repoGetNewsByIdsOrLinks,
  repoGetParticipants,
  repoGetNewsByParticipant,
} from '../repo/repo.js';

import { amaliaCallDirectChat } from '../amalia/amalia.calls.js';

import { serviceSearchNews } from '../services/services.js';

import { TOPICS, SOURCES, MOCK_RESPONSE } from '../config/constants.js';

export const controlGetDailyNews = async (req, res) => {
  try {
    const topic = req.query.topic || 'all';
    const source = req.query.source || 'all';
    const dateParam = req.query.date || new Date().toISOString().split('T')[0];

    // Allow 'all' as a special case, otherwise check the TOPICS/SOURCES array
    if (topic !== 'all' && !TOPICS.includes(topic)) {
      return res.status(400).json({
        error: 'Invalid topic',
        message: `The topic "${topic}" is not supported.`,
        validTopics: TOPICS,
      });
    }

    if (source !== 'all' && !SOURCES.includes(source)) {
      return res.status(400).json({
        error: 'Invalid source',
        message: `The source "${source}" is not supported.`,
        validSources: SOURCES,
      });
    }

    const result = await repoGetDailyNews(topic, source, dateParam);

    res.status(200).json({
      news: result,
      topic: topic,
      source: source,
    });
  } catch (error) {
    console.error(
      '[USER CONTROLLER ERROR]: controlGetDailyNews - ',
      error.message
    );
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const controlGetDailySummary = async (req, res) => {
  try {
    const topic = req.query.topic || 'all';
    const dateParam = req.query.date || new Date().toISOString().split('T')[0];

    if (topic !== 'all' && !TOPICS.includes(topic)) {
      return res.status(400).json({
        error: 'Invalid topic',
        message: `The topic "${topic}" is not supported.`,
        validTopics: TOPICS,
      });
    }

    if (dateParam) {
      const parsedDate = new Date(dateParam);

      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid date format',
          message: 'Date must be in ISO format (YYYY-MM-DD)',
        });
      }
    }

    // Fetch from repository with topic + optional date
    const result = await repoGetDailySummary(topic, dateParam);

    const summaryText = result?.dailySummary || result;

    if (!summaryText) {
      return res.status(200).json({
        summary: 'Resumo diário das notícias não disponível',
        exists: false,
      });
    }

    res.status(200).json({
      summary: summaryText,
      topic,
      date: result?.date,
      createdAt: result?.createdAt,
      exists: true,
    });
  } catch (error) {
    console.error(
      '[USER CONTROLLER ERROR]: controlGetDailySummary - ',
      error.message
    );

    res.status(500).json({ error: 'Internal server error' });
  }
};

export const controlGetWeeklySummary = async (req, res) => {
  try {
    const dateParam = req.query.date || new Date().toISOString().split('T')[0];

    if (dateParam) {
      const parsedDate = new Date(dateParam);

      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid date format',
          message: 'Date must be in ISO format (YYYY-MM-DD)',
        });
      }
    }

    // Fetch from repository with optional date
    const result = await repoGetWeeklySummary(dateParam);

    const summaryText = result?.weeklySummary || result;

    if (!summaryText) {
      return res.status(200).json({
        summary: 'Resumo semanal das notícias não disponível',
        exists: false,
      });
    }

    res.status(200).json({
      summary: summaryText,
      date: result?.date,
      createdAt: result?.createdAt,
      exists: true,
    });
  } catch (error) {
    console.error(
      '[USER CONTROLLER ERROR]: controlGetDailySummary - ',
      error.message
    );

    res.status(500).json({ error: 'Internal server error' });
  }
}

export const controlSearchNews = async (req, res) => {
  try {
    const query = req.query.q;

    if (!query || !query.trim()) {
      return res.status(400).json({
        error: 'Query parameter "q" is required.',
      });
    }

    const result = await serviceSearchNews(query);

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Search failed',
      });
    }

    res.status(200).json({
      query,
      results: result.results,
      count: result.results.length,
    });
  } catch (error) {
    console.error(
      '[USER CONTROLLER ERROR]: controlSearchNews - ',
      error.message
    );
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const controlGetSubjects = async (req, res) => {
  try {
    const topic = req.query.topic || 'all';
    const date = req.query.date || new Date().toISOString().split('T')[0];

    if (topic !== 'all' && !TOPICS.includes(topic)) {
      return res.status(400).json({
        error: 'Invalid topic',
        message: `The topic "${topic}" is not supported.`,
        validTopics: TOPICS,
      });
    }

    const result = await repoGetSubjects(topic, date);
    res.status(200).json({
      subjects: result,
    });
  } catch (error) {
    console.error(
      '[USER CONTROLLER ERROR]: controlGetSubjects- ',
      error.message
    );
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const controlGetNewsBySubject = async (req, res) => {
  try {
    const subjectId = req.query.subjectId;

    if (!subjectId || !subjectId.trim()) {
      return res.status(400).json({ error: 'Subject Id is required.' });
    }

    const result = await repoGetNewsBySubject(subjectId.trim());

    res.status(200).json({
      news: result,
    });
  } catch (error) {
    console.error(
      '[USER CONTROLLER ERROR]: controlGetNewsBySubject - ',
      error.message
    );
    res.status(500).json({ error: 'Internal server error' });
  }
};

const buildWeekRange = (dateParam) => {
  const now = dateParam ? new Date(dateParam) : new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - 6);

  return {
    weekStart: start.toISOString().split('T')[0],
    weekEnd: end.toISOString().split('T')[0],
  };
};

const labelToId = (label) => {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
};

export const controlGetWeeklyThemes = async (req, res) => {
  try {
    const { date } = req.query;

    // Date Validation
    if (date && isNaN(new Date(date).getTime())) {
      return res.status(400).json({
        error: 'Invalid date format',
        message: 'Date must be in ISO format (YYYY-MM-DD)',
      });
    }

    const { weekStart, weekEnd } = buildWeekRange(date);

    // 1: Fetch and format the Themes
    const themes = await repoGetThemes();
    if (!themes || themes.length === 0) {
      return res
        .status(200)
        .json({ weekStart, weekEnd, themes: [], subjects: [] });
    }

    // 2: Collect all Subject IDs & Fetch them
    const allSubjectIds = [];
    for (const theme of themes) {
      if (theme.subject_ids) {
        allSubjectIds.push(...theme.subject_ids);
      }
    }

    // Deduplicate IDs so we don't fetch the same subject twice
    const uniqueSubjectIds = [...new Set(allSubjectIds)];

    // Fetch the subjects
    const { active, archived } = await repoGetSubjectsByIds(uniqueSubjectIds);
    const subjects = [...(active || []), ...(archived || [])];

    return res.status(200).json({
      weekStart,
      weekEnd,
      themes,
      subjects,
    });
  } catch (error) {
    console.error(
      '[USER CONTROLLER ERROR]: controlGetWeeklyThemes - ',
      error.message
    );
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const apiCallRagChat = async (message, sessionId) => {
  try {
    // 150-second timeout: gives the RAG pipeline (90s LLM + overhead) time to finish
    const response = await fetch(`${process.env.CLUSTER_API_URL}/rag_chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, session_id: sessionId }),
      signal: AbortSignal.timeout(150_000),
    });

    if (!response.ok) {
      throw new Error(`RAG API responded with status: ${response.status}`);
    }

    const data = await response.json();

    const mappedReferences = (data.sources || []).map((source) => ({
      id: source.id,
      title: source.title || 'Notícia',
      summary: source.original_summary || source.summary_text,
      source: 'Diário do AMALIA',
      sourceUrl: source.url,
      topics: [source.topic],
      publishedAt: source.publishedAt || new Date().toISOString(),
      relevanceScore: source.score,
    }));

    return {
      success: true,
      message: data.answer,
      references: mappedReferences,
    };
  } catch (error) {
    console.error('[LLM ERROR]: Failed to call RAG API:', error.message);
    return {
      success: false,
      message: 'Desculpe, ocorreu um erro ao processar a sua pergunta.',
      references: [],
    };
  }
};

export const controlChat = async (req, res) => {
  try {
    const { message, session_id } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const result = await apiCallRagChat(message, session_id);

    if (!result.success) {
      return res
        .status(500)
        .json({ error: 'RAG API error', message: result.message });
    }

    res.status(200).json({
      message: result.message,
      references: result.references,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[USER CONTROLLER ERROR]: controlChat - ', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const controlChatDirect = async (req, res) => {
  try {
    const { message, session_id, article_ids, subject_label } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    let newsContext = [];
    if (article_ids && article_ids.length > 0) {
      newsContext = await repoGetNewsByIdsOrLinks(article_ids);
    } else if (subject_label) {
      newsContext = await repoGetNewsBySubject(subject_label);
    }

    if (!newsContext || newsContext.length === 0) {
      return res
        .status(400)
        .json({ error: 'No context provided or found for direct chat.' });
    }

    const result = await amaliaCallDirectChat(message, session_id, newsContext);

    if (!result.success) {
      return res
        .status(500)
        .json({ error: 'Direct Chat API error', message: result.message });
    }

    res.status(200).json({
      message: result.message,
      references: result.references,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      '[USER CONTROLLER ERROR]: controlChatDirect - ',
      error.message
    );
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const controlGetParticipants = async (req, res) => {
  try {
    // 1. Fetch active participants
    const participants = await repoGetParticipants();
    if (!participants || participants.length === 0) {
      return res.status(200).json({ participants: [], news: [] });
    }

    // 2. Extract and flatten all referenced news keys across every participant profile
    const allNewsLinks = [];
    for (const participant of participants) {
      if (participant.news_labels && Array.isArray(participant.news_labels)) {
        allNewsLinks.push(...participant.news_labels);
      }
    }

    // 3. Deduplicate references so a shared article is only requested once
    const uniqueNewsLinks = [...new Set(allNewsLinks)];

    // 4. Batch query the database for all unique news documents matching those keys
    const newsArticles =
      uniqueNewsLinks.length > 0
        ? await repoGetNewsByIdsOrLinks(uniqueNewsLinks)
        : [];

    return res.status(200).json({
      participants,
      news: newsArticles,
    });
  } catch (error) {
    console.error(
      '[USER CONTROLLER ERROR]: controlGetParticipants - ',
      error.message
    );
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const controlGetNewsByParticipant = async (req, res) => {
  try {
    const participantId = req.query.participantId;

    if (!participantId || !participantId.trim()) {
      return res.status(400).json({ error: 'Participant Id is required.' });
    }

    const result = await repoGetNewsByParticipant(participantId.trim());

    res.status(200).json({
      news: result,
    });
  } catch (error) {
    console.error(
      '[USER CONTROLLER ERROR]: controlGetNewsByParticipant - ',
      error.message
    );
    res.status(500).json({ error: 'Internal server error' });
  }
};
