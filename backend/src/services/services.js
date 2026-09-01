import {
  repoGetDailyNews,
  repoInsertNewsItem,
  repoInsertDailySummary,
  repoInsertWeeklySummary,
  repoArchiveOldNews,
  repoGetNewsByLinks,
  repoSaveSubject,
  repoDeleteAllSubjects,
  repoArchiveOldSummaries,
  repoArchiveOldWeeklySummaries,
  repoCopySubjectsSnapshot,
  repoGetSubjectPointsFromLast7Days,
  repoUpsertTheme,
  repoArchiveOldThemes,
  repoDeleteAllThemes,
  repoCopyThemesSnapshot,
  repoInsertOrUpdateParticipant,
  repoGetParticipants,
  repoArchiveStaleParticipants,
  repoGetSubjects,
} from '../repo/repo.js';
import {
  amaliaGenerateDailySummary,
  amaliaGenerateDailySummaryBatches,
  amaliaGenerateWeeklySummaryBatches,
  amaliaCategorizeNews,
  amaliaScoreNews,
  amaliaLabelTheme,
  amaliaExtractParticipants,
  renderArticle,
} from '../amalia/amalia.calls.js';
import {
  LLM_PROMPTS,
  AMALIA_MAX_TOKENS,
  SUMMARY_MAX_TOKENS,
  TOKEN_SAFETY_MARGIN,
  WRAPPER_TOKENS,
  estimateTokens,
} from '../amalia/amalia.constants.js';

import { TOPICS, TOP_SUBJECTS_FOR_SUMMARY, PARTICIPANTS_OLD_TRESHOLD } from '../config/constants.js';
import { getCurrentWeekMonday } from '../lib/helpers.js';

import { ObjectId } from 'mongodb';

export const serviceGenerateDailySummaries = async () => {
  const now = new Date();
  const todayDateOnly = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const topicsToProcess = ['all', ...TOPICS];

  const summaryResults = [];

  // Map each topic to an async execution promise
  const summaryPromises = topicsToProcess.map(async (currentTopic) => {
    try {
      // STEP 1: Build the list of items to summarise.
      console.log(`[SERVICE] Starting summary for topic: ${currentTopic}`);

      let summaryItems;

      if (currentTopic === 'all') {
        // The global summary is built from the top-scoring subjects (their
        // labels), not the raw news feed.
        const subjects = await repoGetSubjects('all');

        if (!subjects || subjects.length === 0) {
          console.warn(`[SERVICE] Skipping "all": No subjects found.`);
          return { topic: currentTopic, success: false, reason: 'no_subjects' };
        }

        summaryItems = [...subjects]
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, TOP_SUBJECTS_FOR_SUMMARY)
          .map((subject) => ({ title: subject.label, summary: '' }));
      } else {
        const news = await repoGetDailyNews(currentTopic);

        if (!news || news.length === 0) {
          console.warn(`[SERVICE] Skipping "${currentTopic}": No news found.`);
          return { topic: currentTopic, success: false, reason: 'no_news' };
        }

        summaryItems = news.map((item) => ({
          title: item.title,
          summary: item.summary,
        }));
      }

      // STEP 2: Get summary for the items
      const summary = await serviceFetchSummaryBatches(summaryItems, currentTopic);
      console.log(
        `[SERVICE] Summary generated for "${currentTopic}" (${summary.length} chars)`
      );

      // STEP 3: Store summary in DB
      await repoInsertDailySummary({
        date: todayDateOnly,
        topic: currentTopic,
        dailySummary: summary,
        createdAt: new Date(),
      });

      return { topic: currentTopic, success: true };
    } catch (err) {
      console.error(`[SERVICE ERROR] Topic ${currentTopic} failed:`, err.message);
      return { topic: currentTopic, success: false, error: err.message };
    }
  });

  // Execute all promises in parallel
  // We might need to change to executing them 3 at a time
  // (because of the ammount of db operations in parallel, but shouldnt be a problem)
  const results = await Promise.all(summaryPromises);

  return {
    success: results.some(r => r.success), // Success if at least one worked
    results: results,
  };
};

export const serviceFetchSummaryBatches = async (news, topic) => {
  let currentSummary = '';

  // Tokens consumed by everything other than the news payload in each request.
  const systemPromptTokens = estimateTokens(LLM_PROMPTS.SUMMARY);
  // Fixed labels wrapping the payload ("Novas notícias:", "Resumo anterior...").
  const WRAPPER_TOKENS = LLM_PROMPTS.WRAPPER_TOKENS;

  try {
    let processed = 0;

    while (processed < news.length) {
      // Recompute the payload budget each pass: the running summary grows and
      // eats into the available context window.
      const reservedTokens =
        systemPromptTokens +
        estimateTokens(currentSummary) +
        SUMMARY_MAX_TOKENS +
        WRAPPER_TOKENS;

      const payloadBudget = Math.floor(
        (AMALIA_MAX_TOKENS - reservedTokens) * TOKEN_SAFETY_MARGIN
      );

      // Greedily pack as many items as fit into the remaining budget.
      const batch = [];
      let batchTokens = 0;

      while (processed < news.length) {
        const itemTokens = estimateTokens(renderArticle(news[processed]));

        // Always keep at least one item so a single oversized entry can't stall.
        if (batch.length > 0 && batchTokens + itemTokens > payloadBudget) break;

        batch.push(news[processed]);
        batchTokens += itemTokens;
        processed++;
      }

      currentSummary = await amaliaGenerateDailySummaryBatches(
        batch,
        currentSummary
      );

      console.log(
        `[BATCH of ${topic}] Processed ${processed} of ${news.length} articles.`
      );
    }

    return currentSummary;
  } catch (err) {
    console.error(
      '[SERVICE ERROR]: serviceFetchSummaryBatches - failed:',
      err.message
    );
    throw err;
  }
};

export const serviceFetchWeeklySummaryBatches = async (subjects) => {
  let currentSummary = '';
  const BATCH_SIZE = 30;

  try {
    for (let i = 0; i < subjects.length; i += BATCH_SIZE) {
      const subjectsBatch = subjects.slice(i, i + BATCH_SIZE);

      currentSummary = await amaliaGenerateWeeklySummaryBatches(
        subjectsBatch,
        currentSummary
      );

      console.log(
        `[BATCH] Processed ${i + subjectsBatch.length} of ${subjects.length} subjects.`
      );
    }

    return currentSummary;
  } catch (err) {
    console.error(
      '[SERVICE ERROR]: serviceFetchSummaryBatches - failed:',
      err.message
    );
    throw err;
  }
};

export const serviceGenerateWeeklySummaries = async () => {
  const now = new Date();

  const todayDateOnly = new Date(Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0, 0, 0, 0
  ));

  const weekStart = getCurrentWeekMonday();

  try {
    // STEP 1: Get all weekly subjects
    console.log(`[SERVICE] Starting weekly summary generation`);

    const subjectPoints = await repoGetSubjectPointsFromLast7Days();

    if (!subjectPoints || subjectPoints.length < 2) {
      console.warn('[THEMES] Not enough subject points to build weekly themes.');
      return { success: true, themes: 0, points: subjectPoints?.length || 0 };
    }

    const validSubjectPoints = subjectPoints.filter(
      (item) => Array.isArray(item.centroid) && item.centroid.length > 0
    );

    const cleanedSubjects = validSubjectPoints.map((item) => ({
      label: item.label,
    }));

    // STEP 2: Get summary for subjects
    const summary = await serviceFetchWeeklySummaryBatches(cleanedSubjects);
    console.log(
      `[SERVICE] Summary generated (${summary.length} chars)`
    );

    // STEP 3: Store summary in DB
    await repoInsertWeeklySummary({
      createdAt: todayDateOnly,
      weekStart: weekStart,
      weeklySummary: summary,
      createdAt: new Date(),
    });

    return { success: true };
  } catch (err) {
    console.error(`[SERVICE ERROR] Weekly summary generation failed:`, err.message);
    return { success: false, error: err.message };
  }
};

export const serviceFetchSummary = async (news) => {
  try {
    const summary = await amaliaGenerateDailySummary(news);
    return summary;
  } catch (err) {
    console.error(
      '[SERVICE ERROR]: serviceFetchSummary - failed:',
      err.message
    );
    throw err;
  }
};

export const serviceCategorizeNews = async (newsItem) => {
  try {
    const newsText = `### Título\n${newsItem.title || ''}\n\n### Resumo\n${newsItem.summary || ''}`;

    const topics = await amaliaCategorizeNews(newsText);

    const rankedTopics = topics.map((name, index) => ({
       name: name,
       rank: index + 1,
    }));
    return {
      success: true,
      topics: rankedTopics,
    };
  } catch (err) {
    console.error(
      '[SERVICE ERROR]: serviceCategorizeNews - failed:',
      err.message
    );
    return {
      success: false,
      topics: [{ name: 'Outro', rank: 1 }],
    };
  }
};

export const serviceExtractParticipants = async (cleanedNewsItem, newsItem) => {
  try {
    const newsText = `### Título\n${cleanedNewsItem.title || ''}\n\n### Resumo\n${cleanedNewsItem.summary || ''}`;

    const existingParticipants = await repoGetParticipants();
    const existingNames = existingParticipants.map(p => p.name).join(',');

    const detectedNames = await amaliaExtractParticipants(newsText, existingNames);

    const participantIds = [];

    for (const name of detectedNames) {
      if (name === 'N/A') continue;

      const result = await repoInsertOrUpdateParticipant(name, newsItem.link);

      if (result && result._id) {
        participantIds.push(result._id);
      }
    }

    return {
      success: true,
      participants: participantIds,
      names: detectedNames.filter(name => name && name !== 'N/A') // For logging
    };

  } catch (err) {
    console.error(
      '[SERVICE ERROR]: serviceExtractParticipants - failed:',
      err.message
    );
    return {
      success: false,
      participants:[],
      names: [],
    };
  }
}

export const serviceRankNews = async (newsItem) => {
  try {
    const newsText = `### Título\n${newsItem.title || ''}\n\n### Resumo\n${newsItem.summary || ''}`;

    const scores = await amaliaScoreNews(newsText);

    if (!scores) {
      return { success: false, scores: { index: 0 } };
    }

    /*
      CÁLCULO: Índice = (Relevância × 2) + (Proximidade × 2) + Novidade + Atualidade + Continuidade + Notoriedade + Negatividade
      9–21 = BAIXO | 22–33 = MÉDIO | 34–45 = ALTO
    */
    scores.index =
      scores.relevance * 2 +
      scores.proximity * 2 +
      scores.novelty +
      scores.actuality +
      scores.continuity +
      scores.notoriety +
      scores.negativity;

    if (scores.index <= 21) scores.classification = 'BAIXO';
    else if (scores.index <= 33) scores.classification = 'MÉDIO';
    else scores.classification = 'ALTO';

    return {
      success: true,
      scores,
    };
  } catch (err) {
    console.error('[SERVICE ERROR]: serviceRankNews - failed:', err.message);
    return {
      success: false,
      scores: null,
    };
  }
};

export const serviceArchiveOldNews = async () => {
  try {
    // Keep everything in a 24 hour range
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Reset minutes, seconds, and ms to zero.
    cutoff.setMinutes(0, 0, 0);

    console.log(
      `[SERVICE]: Archive boundary set to top of the hour: ${cutoff.toLocaleString()}`
    );

    const archivedCount = await repoArchiveOldNews(cutoff);

    return { success: true, count: archivedCount };
  } catch (err) {
    console.error(`[SERVICE ERROR]: ${err.message}`);
    throw err;
  }
};

export const serviceArchiveOldSummaries = async () => {
  try {
    // Keep everything in a 24 hour range
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Reset minutes, seconds, and ms to zero.
    cutoff.setMinutes(0, 0, 0);

    console.log(
      `[SERVICE]: Archive boundary set to top of the hour: ${cutoff.toLocaleString()}`
    );

    const archivedCount = await repoArchiveOldSummaries(cutoff);

    return { success: true, count: archivedCount };
  } catch (err) {
    console.error(`[SERVICE ERROR]: ${err.message}`);
    throw err;
  }
};

export const serviceArchiveWeeklyOldSummaries = async () => {
  try {
    // Calculate this week's Monday
    const currentWeekMonday = getCurrentWeekMonday();

    console.log(
      `[SERVICE]: Weekly Archive boundary set to current week's Monday: ${currentWeekMonday.toISOString()}`
    );

    const archivedCount = await repoArchiveOldWeeklySummaries(currentWeekMonday);

    return { success: true, count: archivedCount };
  } catch (err) {
    console.error(`[SERVICE ERROR]: serviceArchiveWeeklyOldSummaries - ${err.message}`);
    throw err;
  }
};

// Archives participants whose last appearance is older than x, keeping
// the active participants collection small for fast frontend listing.
export const serviceArchiveStaleParticipants = async () => {
  try {
    // Keep participants seen within the last month active.
    // TODO: We should pass this to a config var
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - PARTICIPANTS_OLD_TRESHOLD);

    console.log(
      `[SERVICE]: Participant archive boundary set to: ${cutoff.toISOString()}`
    );

    const archivedCount = await repoArchiveStaleParticipants(cutoff);

    return { success: true, count: archivedCount };
  } catch (err) {
    console.error(`[SERVICE ERROR]: serviceArchiveStaleParticipants - ${err.message}`);
    throw err;
  }
};

const serviceEmbedNewsTitle = async (title) => {
  try {
    const response = await fetch(`${process.env.CLUSTER_API_URL}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });

    if (!response.ok)
      throw new Error(`Embedding API failed: ${response.status}`);

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error(`[AI ERROR]: Failed to embed "${title}":`, error.message);
    return null;
  }
};

const SIM_THRESHOLD = 0.8;

// Helper: Cosine Similarity
const getCosineSimilarity = (vecA, vecB) => {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magA * magB);
};

const findMedoid = (embeddings) => {
  let bestIdx = 0;
  let bestAvgSim = -1;

  for (let i = 0; i < embeddings.length; i++) {
    const avgSim =
      embeddings.reduce((sum, e, j) => {
        if (i === j) return sum;
        return sum + getCosineSimilarity(embeddings[i], e);
      }, 0) /
      (embeddings.length - 1);

    if (avgSim > bestAvgSim) {
      bestAvgSim = avgSim;
      bestIdx = i;
    }
  }

  return bestIdx;
};

// Helper: to aggregate topics
const aggregateTopics = (clusterNews) => {
  const frequencyMap = {};

  clusterNews.forEach(news => {
    news.topics?.forEach(topic => {
      if (!frequencyMap[topic.name]) {
        frequencyMap[topic.name] = { count: 0, totalRank: 0 };
      }
      frequencyMap[topic.name].count += 1;
      frequencyMap[topic.name].totalRank += topic.rank;
    });
  });

  // Converter para array, ordenar por frequência e depois por melhor rank (menor valor)
  return Object.entries(frequencyMap)
    .map(([name, data]) => ({
      name,
      count: data.count,
      avgRank: data.totalRank / data.count
    }))
    .sort((a, b) => b.count - a.count || a.avgRank - b.avgRank)
    .slice(0, 3) // Máximo de 3 tópicos por cluster
    .map((item, index) => ({
      name: item.name,
      rank: index + 1
    }));
};

export const serviceReclusterAllNews = async () => {
  try {
    console.log('[RECLUSTER] Starting full reclustering process...');

    // 1. Fetch daily news first (before deleting clusters)
    const newsItems = await repoGetDailyNews();
    if (!newsItems || newsItems.length === 0) {
      console.warn('[RECLUSTER] No news found to cluster.');
      return { success: true, clustered: 0 };
    }

    console.log(`[RECLUSTER] Clustering ${newsItems.length} news items...`);

    // 2. Send titles to Python for clustering
    const titles = newsItems.map((n) => n.title);

    const response = await fetch(`${process.env.CLUSTER_API_URL}/cluster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(titles),
    });

    if (!response.ok) throw new Error(`Cluster API failed: ${response.status}`);

    const { labels, embeddings } = await response.json();
    // Python returns: labels[i] = cluster ID for newsItems[i]
    // Python returns: embeddings[i] = vector for newsItems[i]

    // 3. Delete old subjects (only after we have new ones ready)
    const deletedCount = await repoDeleteAllSubjects();
    console.log(`[RECLUSTER] Deleted ${deletedCount} existing subjects.`);

    // 4. Build cluster objects from labels + embeddings
    const clusterMap = new Map(); // clusterID -> { embeddings: [], indices: [] }

    for (let i = 0; i < newsItems.length; i++) {
      const label = labels[i];
      if (!clusterMap.has(label)) {
        clusterMap.set(label, {
          embeddings: [],
          newsIds: [],
          indices: [],
        });
      }
      clusterMap.get(label).embeddings.push(embeddings[i]);
      clusterMap.get(label).newsIds.push(newsItems[i].link);
      clusterMap.get(label).indices.push(i);
    }

    // 5. Save each cluster with computed centroid
    const now = new Date();

    const subjectIdMap = new Map();

    for (const [
      clusterId,
      { embeddings: clusterEmbeddings, newsIds, indices },
    ] of clusterMap) {

      // 5.1 filter for clusters with 3 or more news
      if (newsIds.length < 3) continue;

      // 5.2 Get news articles from this cluster
      const clusterNews = indices.map(idx => newsItems[idx]);

      // 5.3 Calculate average public interest index
      const totalScore = clusterNews.reduce((sum, item) => sum + (item.score?.index || 0), 0);
      const avgScore = Math.round(totalScore / clusterNews.length);

      // 5.4 Calculate topics
      const clusterTopics = aggregateTopics(clusterNews);

      // 5.5 Calculate centroid
      const centroid = clusterEmbeddings[0].map(
        (_, dim) =>
          clusterEmbeddings.reduce((sum, e) => sum + e[dim], 0) /
          clusterEmbeddings.length
      );

      const newsLinks = indices.map((idx) => newsItems[idx].link);
      const medoidIdx = findMedoid(clusterEmbeddings);
      const representativeTitle = newsItems[indices[medoidIdx]].title;

      // 5.6 Manually generating the id here
      const mongoSubjectId = new ObjectId();

      await repoSaveSubject({
        _id: mongoSubjectId,
        label: representativeTitle,
        centroid,
        count: newsIds.length,
        news_labels: newsLinks,
        topics: clusterTopics,
        score: avgScore,
        created_at: now,
        last_updated: now,
      });

      // Map cluster int ID → stable label so news items can carry it
      subjectIdMap.set(clusterId, mongoSubjectId);
    }

    console.log(`[RECLUSTER] Saved ${clusterMap.size} clusters.`);

    // 6. Update each news item's stable subject_label
    const updatePromises = newsItems.map((item, i) =>{
      const clusterId = labels[i];
      const targetObjectId = subjectIdMap.get(clusterId);

      return repoInsertNewsItem({
        ...item,
        subject_id: targetObjectId,
        embedding: embeddings[i],
      })
    });

    await Promise.all(updatePromises);

    console.log('[RECLUSTER] Full reclustering complete.');
    return {
      success: true,
      clustered: newsItems.length,
      clusters: subjectIdMap.size,
    };
  } catch (error) {
    console.error('[RECLUSTER ERROR]:', error.message);
    return { success: false, error: error.message };
  }
};

// Search news using OpenSearch hybrid search pipeline
export const serviceSearchNews = async (query) => {
  try {
    if (!query || !query.trim()) {
      return { success: true, results: [] };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    // Call OpenSearch hybrid search via cluster API
    const response = await fetch(`${process.env.CLUSTER_API_URL}/search_news`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ query }),
    });
    clearTimeout(timeoutId);

    if (!response.ok)
      throw new Error(`Search API failed: ${response.status}`);

    const { results } = await response.json();

    // Safety net: avoid returning duplicated entries when upstream retrieval
    // contains repeated URLs/IDs.
    const seenDocs = new Set();
    const uniqueResults = (results || []).filter((doc) => {
      const key = doc?.url || doc?.id;
      if (!key || seenDocs.has(key)) return false;
      seenDocs.add(key);
      return true;
    });

    // Hydrate full article payload from DB so frontend gets author/site_name/date/categories.
    const rankedLinks = uniqueResults
      .map((doc) => doc.url)
      .filter(Boolean);

    const dbNews = rankedLinks.length > 0 ? await repoGetNewsByLinks(rankedLinks) : [];
    const byLink = new Map((dbNews || []).filter((item) => item?.link).map((item) => [item.link, item]));

    // Preserve OpenSearch ranking order while returning full DB-backed article shape.
    const news = uniqueResults.map((doc) => {
      const dbItem = byLink.get(doc.url);

      if (dbItem) {
        return {
          ...dbItem,
          id: dbItem._id?.toString?.() || doc.id,
        };
      }

      // Fallback for rare missing-link cases.
      return {
        id: doc.id,
        _id: doc.id,
        title: doc.title || '',
        summary: doc.original_summary || doc.summary_text || '',
        link: doc.url || '',
        site_name: 'Fonte desconhecida',
        date: doc.publishedAt || new Date().toISOString(),
        author: 'N.A',
        categories: [],
        topics: doc.topic ? [{ name: doc.topic, rank: 1 }] : [{ name: 'Outro', rank: 1 }],
        score: null,
      };
    });

    return {
      success: true,
      results: news,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('[SEARCH ERROR]: Search request timed out after 15s');
      return {
        success: false,
        error: 'Search request timed out',
      };
    }

    console.error('[SEARCH ERROR]:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const serviceSnapshotSubjects = async () => {
  try {
    console.log('[SNAPSHOT] Copying current subjects to oldSubjects...');
    const result = await repoCopySubjectsSnapshot();
    console.log('[SNAPSHOT] Subjects snapshot complete.');
    return { success: true, result };
  } catch (err) {
    console.error('[SERVICE ERROR]: serviceSnapshotSubjects -', err.message);
    return { success: false, error: err.message };
  }
};

export const serviceSnapshotThemes = async () => {
  try {
    console.log('[SNAPSHOT] Copying current themes to oldThemes...');
    const result = await repoCopyThemesSnapshot();
    console.log('[SNAPSHOT] Themes snapshot complete.');
    return { success: true, result };
  } catch (err) {
    console.error('[SERVICE ERROR]: serviceSnapshotThemes -', err.message);
    return { success: false, error: err.message };
  }
};

export const serviceReclusterWeeklyThemes = async () => {
  try {
    const subjectPoints = await repoGetSubjectPointsFromLast7Days();

    if (!subjectPoints || subjectPoints.length < 2) {
      console.warn('[THEMES] Not enough subject points to build weekly themes.');
      return { success: true, themes: 0, points: subjectPoints?.length || 0 };
    }

    const validSubjectPoints = subjectPoints.filter(
      (item) => Array.isArray(item.centroid) && item.centroid.length > 0
    );
    const vectors = validSubjectPoints.map((item) => item.centroid);

    if (vectors.length < 2) {
      console.warn('[THEMES] Not enough valid centroids to cluster themes.');
      return { success: true, themes: 0, points: vectors.length };
    }

    const response = await fetch(`${process.env.CLUSTER_API_URL}/cluster_vectors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vectors }),
    });

    if (!response.ok)
      throw new Error(`Theme clustering API failed: ${response.status}`);

    const { labels } = await response.json();

    const themeMap = new Map();
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      if (!themeMap.has(label)) {
        themeMap.set(label, { vectors: [], indices: [] });
      }
      themeMap.get(label).vectors.push(vectors[i]);
      themeMap.get(label).indices.push(i);
    }

    const now = new Date();

    // Full-replace strategy: active themes must reflect only this recalculation pass.
    const deletedBeforeInsert = await repoDeleteAllThemes();

    let persistedThemes = 0;
    for (const [, themeData] of themeMap) {
      const { vectors: clusterVectors, indices } = themeData;

      if (clusterVectors.length < 3) continue;

      const centroid = clusterVectors[0].map(
        (_, dim) =>
          clusterVectors.reduce((sum, e) => sum + e[dim], 0) /
          clusterVectors.length
      );

      const subjectIds = indices
        .map((i) => validSubjectPoints[i]._id)
        .filter(Boolean);

      const subjectLabels = indices.map((i) => validSubjectPoints[i].label);

      // 1. Format the aggregated labels as context for AMALIA
      const newsTextForLLM = subjectLabels.join('\n');

      // 2. Call AMALIA to generate the unified theme title
      const themeLabel = await amaliaLabelTheme(newsTextForLLM);

      // Pre-generate the _id here
      const themeId = new ObjectId();

      await repoUpsertTheme({
        _id: themeId,
        label: themeLabel,
        centroid,
        count: Math.round(clusterVectors.length),
        subject_ids: subjectIds,
        last_updated: now,
        created_at: now,
      });

      persistedThemes++;
    }

    console.log(
      `[THEMES] Reclustered ${persistedThemes} weekly themes (persisted). Replaced active set (deleted ${deletedBeforeInsert} before insert).`
    );

    return {
      success: true,
      themes: persistedThemes,
      points: vectors.length,
    };
  } catch (err) {
    console.error('[THEMES ERROR]:', err.message);
    return { success: false, error: err.message };
  }
};
