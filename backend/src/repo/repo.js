import initializeDB from '../db.js';
import dotenv from 'dotenv';
import { ObjectId } from 'mongodb';
import { getCurrentWeekMonday } from '../lib/helpers.js';
import { CUTOFF_MS } from '../config/constants.js';

// Variable to hold the connected instance
let dbInstance;

dotenv.config();

// Wrapper to ensure the database connection is ready
const getDbInstance = async () => {
  if (!dbInstance) {
    dbInstance = await initializeDB(); // Wait to resolve
  }
  return dbInstance;
};

/**
 * Parses a YYYY-MM-DD string as local midnight (avoids UTC shift).
 */
const parseLocalDate = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Returns true if the given YYYY-MM-DD string represents today in local time.
 */
const isDateToday = (dateString) => {
  const localToday = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Europe/Lisbon',
  });
  return dateString === localToday;
};

/**
 * Returns { start, end } covering the full calendar day for a YYYY-MM-DD string.
 */
const getLocalDayRange = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day, 23, 59, 59, 999);
  return { start, end };
};

const useTodayMethod = (date) => !date || isDateToday(date);

export const repoGetDailyNews = async (
  topic = 'all',
  source = 'all',
  date = null
) => {
  const db = await getDbInstance();

  // Build topic filter
  const filter = {};

  if (topic && topic.toLowerCase() !== 'all') {
    // Filter only by the primary topic (index 0), not any secondary topic.
    filter['topics.0.name'] = topic;
  }

  if (source && source.toLowerCase() !== 'all') {
    filter.site_name = source;
  }

  // Determine if the date is today
  const today = useTodayMethod(date);

  if (!today) {
    const { start, end } = getLocalDayRange(date);
    filter.date = { $gte: start, $lte: end };
  }

  try {
    const newsItems = today
      ? await db.listNewsItems(filter)
      : await db.listPastNewsItems(filter);

    return newsItems;
  } catch (err) {
    console.error(
      '[REPO ERROR]: repoGetDailyNews - failed to get daily news: ' + err.stack
    );
    throw new Error('Failed to retrieve daily news from the database.');
  }
};

// Fetches news from current + archived collections by exact article links.
// Used as the primary lookup when a subject has news_labels.
export const repoGetNewsByLinks = async (links = []) => {
  const db = await getDbInstance();

  const sanitizedLinks = [...new Set((links || []).filter(Boolean))];
  if (!sanitizedLinks.length) {
    return [];
  }

  try {
    const [current, archived] = await Promise.all([
      db.collections.news
        .find({ link: { $in: sanitizedLinks } })
        .sort({ date: -1 })
        .toArray(),
      db.collections.oldNews
        .find({ link: { $in: sanitizedLinks } })
        .sort({ date: -1 })
        .toArray(),
    ]);

    return [...current, ...archived];
  } catch (err) {
    console.error('[REPO ERROR]: repoGetNewsByLinks -', err.stack);
    throw new Error('Failed to fetch news by links.');
  }
};

export const repoGetNewsByIdsOrLinks = async (identifiers = []) => {
  const db = await getDbInstance();

  const sanitized = [...new Set((identifiers || []).filter(Boolean))];
  if (!sanitized.length) return [];

  const objectIds = [];
  const links = [];

  for (const id of sanitized) {
    if (ObjectId.isValid(id) && String(new ObjectId(id)) === id) {
      objectIds.push(new ObjectId(id));
    } else {
      links.push(id);
    }
  }

  const query = { $or: [] };
  if (objectIds.length > 0) query.$or.push({ _id: { $in: objectIds } });
  if (links.length > 0) query.$or.push({ link: { $in: links } });

  try {
    const [current, archived] = await Promise.all([
      db.collections.news.find(query).sort({ date: -1 }).toArray(),
      db.collections.oldNews.find(query).sort({ date: -1 }).toArray(),
    ]);

    return [...current, ...archived];
  } catch (err) {
    console.error('[REPO ERROR]: repoGetNewsByIdsOrLinks -', err.stack);
    throw new Error('Failed to fetch news by ids or links.');
  }
};

export const repoGetNewsBySubject = async (subjectId) => {
  const db = await getDbInstance();

  try {
    // 1. Ensure the incoming ID is a proper binary ObjectId instance
    const targetId = typeof subjectId === 'string' ? new ObjectId(subjectId) : subjectId;

    // 2. Search for subject with input id
    const subjectDoc =
      (await db.getSubject(targetId)) ?? (await db.getOldSubject(targetId));

    if (!subjectDoc) {
      console.warn(`[REPO]: No subject found with id: ${subjectId}`);
      return [];
    }

    // 3. Get news by the links stored in the subject
    const newsLinks = [
      ...new Set(subjectDoc.news_labels?.filter(Boolean) || []),
    ];

    if (newsLinks.length === 0) return [];

    const newsFromLinks = (await repoGetNewsByLinks(newsLinks)).filter(Boolean);
    return newsFromLinks.sort((a, b) => new Date(b.date) - new Date(a.date));

  } catch (err) {
    console.error('[REPO ERROR]: repoGetNewsBySubject - ', err.stack);
    throw new Error('Failed to retrieve news for the specified subject.');
  }
};

export const repoGetDailySummary = async (topic = 'all', date = null) => {
  const db = await getDbInstance();

  const filter = topic && topic.toLowerCase() !== 'all' ? { topic: topic } : {};

  // Determine date range
  const today = useTodayMethod(date);

  if (!today) {
    const { start, end } = getLocalDayRange(date);
    filter.date = { $gte: start, $lte: end };
  }

  try {
    const summaryItems = today
      ? await db.listDailySummaryItems(filter, 1)
      : await db.listPastDailySummaryItems(filter, 1);

    return summaryItems.length > 0 ? summaryItems[0] : null;
  } catch (err) {
    console.error(
      '[REPO ERROR]: repoGetDailySummary - failed to get daily summary: ' +
        err.stack
    );
    throw new Error('Failed to retrieve daily summary from the database.');
  }
};

export const repoGetWeeklySummary = async (date = null) => {
  const db = await getDbInstance();

  const filter = {};

  // Determine date range
  const today = useTodayMethod(date);

  if (!today) {
    const { start, end } = getLocalDayRange(date);
    filter.date = { $gte: start, $lte: end };
  }

  try {
    const summaryItems = today
      ? await db.listWeeklySummaryItems(filter, 1)
      : await db.listPastWeeklySummaryItems(filter, 1);

    return summaryItems.length > 0 ? summaryItems[0] : null;
  } catch (err) {
    console.error(
      '[REPO ERROR]: repoGetWeeklySummary - failed to get weekly summary: ' +
        err.stack
    );
    throw new Error('Failed to retrieve weekly summary from the database.');
  }
};

export const repoArchiveOldSummaries = async (keepDate) => {
  const db = await getDbInstance();

  // Find everything where the date is NOT greater than or equal to our threshold.
  const archiveFilter = { date: { $lt: keepDate } };

  try {
    const itemsToMove = await db.listSummaryItems(archiveFilter);

    if (itemsToMove.length > 0) {
      console.log(
        `[REPO]: Attempting to archive ${itemsToMove.length} summary items...`
      );

      await db.archiveSummaryItems(itemsToMove);

      const result = await db.deleteSummaryItems(archiveFilter);

      console.log(
        `[REPO]: Successfully archived and deleted ${result.deletedCount} summary items.`
      );
      return result.deletedCount;
    }

    return 0;
  } catch (err) {
    console.error('[REPO ERROR]: repoArchiveOldSummaries - ' + err.stack);
    console.error(err);
    throw new Error('Failed to move summaries to archive.');
  }
};

export const repoArchiveOldWeeklySummaries = async (keepDate) => {
  const db = await getDbInstance();

  // Find everything where the date is NOT greater than or equal to our threshold.
  const archiveFilter = { weekStart: { $lt: keepDate } };

  try {

    const itemsToMove = await db.listWeeklySummaryItems(archiveFilter);

    if (itemsToMove.length > 0) {
      console.log(
        `[REPO]: Attempting to archive ${itemsToMove.length} weekly summary items...`
      );

      await db.archiveWeeklySummaryItems(itemsToMove);

      const result = await db.deleteWeeklySummaryItems(archiveFilter);

      console.log(
        `[REPO]: Successfully archived and deleted ${result.deletedCount} weekly summary items.`
      );
      return result.deletedCount;
    }

    return 0;
  } catch (err) {
    console.error('[REPO ERROR]: repoArchiveOldWeeklySummaries - ' + err.stack);
    console.error(err);
    throw new Error('Failed to move summaries to archive.');
  }
};

export const repoInsertNewsItem = async (item) => {
  const db = await getDbInstance();

  try {
    // Ensure date is a proper Date object
    if (item.date && !(item.date instanceof Date)) {
      item.date = new Date(item.date);
    }

    const newsItems = await db.insertOrUpdateNewsItem(item);
    return newsItems;
  } catch (err) {
    console.error(
      '[REPO ERROR]: repoInsertNewsItem - failed to Update or Insert: ' +
        err.stack
    );

    // Throw an error for the controller to catch and respond with 500
    throw new Error('Failed to Update or Insert from the database.');
  }
};

export const repoInsertDailySummary = async (item) => {
  const db = await getDbInstance();

  try {
    // Ensure date is a proper Date object
    if (item.date && !(item.date instanceof Date)) {
      item.date = new Date(item.date);
    }

    const dailySummaryItem = await db.insertOrUpdateDailySummaryItem(item);
    return dailySummaryItem;
  } catch (err) {
    console.error(
      '[REPO ERROR]: repoInsertDailySummary- failed to Update or Insert: ' +
        err.stack
    );

    // Throw an error for the controller to catch and respond with 500
    throw new Error('Failed to Update or Insert from the database.');
  }
};

export const repoInsertWeeklySummary = async (item) => {
  const db = await getDbInstance();

  try {
    // Ensure createdAt is a proper Date object
    if (item.createdAt && !(item.createdAt instanceof Date)) {
      item.createdAt = new Date(item.createdAt);
    }
    if (item.weekStart && !(item.weekStart instanceof Date)) {
      item.weekStart = new Date(item.weekStart);
    }

    const weeklySummaryItem = await db.insertOrUpdateWeeklySummaryItem(item);
    return weeklySummaryItem;

  } catch (err) {
    console.error(
      '[REPO ERROR]: repoInsertWeeklySummary- failed to Update or Insert: ' +
        err.stack
    );

    // Throw an error for the controller to catch and respond with 500
    throw new Error('Failed to Update or Insert from the database.');
  }
};

export const repoArchiveOldNews = async (keepDate) => {
  const db = await getDbInstance();

  // Find everything where the date is NOT greater than or equal to our threshold.
  const archiveFilter = { date: { $lt: keepDate } };

  try {
    const itemsToMove = await db.listNewsItems(archiveFilter, 10000);

    if (itemsToMove.length > 0) {
      console.log(
        `[REPO]: Attempting to archive ${itemsToMove.length} items...`
      );

      await db.archiveNewsItems(itemsToMove);

      const result = await db.deleteNewsItems(archiveFilter);

      console.log(
        `[REPO]: Successfully archived and deleted ${result.deletedCount} items.`
      );
      return result.deletedCount;
    }

    return 0;
  } catch (err) {
    console.error('[REPO ERROR]: repoArchiveOldNews - ' + err.stack);
    console.error(err);
    throw new Error('Failed to move news to archive.');
  }
};

/**
 * Retrieves all subjects.
 */
export const repoGetSubjects = async (topic = 'all', date = null) => {
  const db = await getDbInstance();

  // Build topic filter
  const filter = {};

  if (topic && topic.toLowerCase() !== 'all') {
    // Filter only by primary topic (most important one at index 0).
    filter['topics.0.name'] = topic;
  }

  // Determine if the date is today
  const today = useTodayMethod(date);

  if (!today) {
    const { start, end } = getLocalDayRange(date);
    filter.snapshot_date = { $gte: start, $lte: end };
  }

  try {
    const subjects = today
      ? await db.listSubjects(filter)
      : await db.listOldSubjects(filter);

    return subjects;
  } catch (error) {
    console.error('[REPO ERROR]: repoGetSubjects failed', error);
    throw new Error('Database error while fetching subjects.');
  }
};

export const repoSaveSubject = async (item) => {
  const db = await getDbInstance();

  try {
    return await db.insertSubjectItem(item);
  } catch (err) {
    console.error(
      `[REPO ERROR]: repoSaveSubject failed for id ${item?._id}:`,
      err.stack
    );
    throw new Error('Database operation failed at the repository level.');
  }
};

// Deletes all subject documents from the collection.
export const repoDeleteAllSubjects = async () => {
  const db = await getDbInstance();

  try {
    const result = await db.deleteAllSubjects();
    console.log(`[REPO]: Deleted ${result.deletedCount} subjects.`);
    return result.deletedCount;
  } catch (err) {
    console.error('[REPO ERROR]: repoDeleteAllSubjects -', err.stack);
    throw new Error('Failed to delete subjects.');
  }
};

// Replaces today's oldSubjects snapshot with current subjects.
export const repoCopySubjectsSnapshot = async () => {
  const db = await getDbInstance();

  const now = new Date();
  const snapshotDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  try {
    const result = await db.copySubjectsToOldSubjects(snapshotDate);
    console.log(
      `[REPO]: Snapshot replaced today's oldSubjects with ${result.insertedCount ?? 0} subjects.`
    );
    return result;
  } catch (err) {
    console.error('[REPO ERROR]: repoCopySubjectsSnapshot -', err.stack);
    throw new Error('Failed to copy subjects snapshot.');
  }
};

export const repoCopyThemesSnapshot = async () => {
  const db = await getDbInstance();

  const weekStart = getCurrentWeekMonday();

  try {
    const result = await db.copyThemesToOldThemes(weekStart);
    console.log(
      `[REPO]: Snapshot copied ${result.insertedCount ?? 0} themes into oldThemes for week ${weekStart.toISOString()}.`
    );
    return result;
  } catch (err) {
    console.error('[REPO ERROR]: repoCopyThemesSnapshot -', err.stack);
    throw new Error('Failed to copy themes snapshot.');
  }
};

export const repoGetSubjectsByIds = async (subjectIds = []) => {
  const db = await getDbInstance();

  const targetIds = (subjectIds || [])
    .filter(Boolean)
    .map(id => (typeof id === 'string' ? new ObjectId(id) : id));

  if (!targetIds.length) return { active: [], archived: [] };

  try {
    // Search both active subjects and archived snapshots
    const [active, archived] = await Promise.all([
      db.collections.subjects.find({ _id: { $in: targetIds } }).toArray(),
      db.collections.oldSubjects.find({ _id: { $in: targetIds } }).toArray(),
    ]);

    // Deduplicate — active takes priority over archived for the same _id
    const seen = new Set(active.map(s => s._id.toString()));
    const uniqueArchived = archived.filter(s => !seen.has(s._id.toString()));

    return { active, archived: uniqueArchived };
  } catch (err) {
    console.error('[REPO ERROR]: repoGetSubjectsByIds -', err.stack);
    throw new Error('Failed to fetch subjects by ids.');
  }
};

export const repoGetSubjectPointsFromLast7Days = async () => {
  const db = await getDbInstance();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const windowStart = new Date(todayStart);
  windowStart.setDate(windowStart.getDate() - 6);

  try {
    // Past 6 full days from snapshots + current subjects for today.
    const oldSubjects = await db.listOldSubjects({
      snapshot_date: { $gte: windowStart, $lt: todayStart },
    });
    const currentSubjects = await db.listSubjects({});

    return [...oldSubjects, ...currentSubjects];
  } catch (err) {
    console.error(
      '[REPO ERROR]: repoGetSubjectPointsFromLast7Days -',
      err.stack
    );
    throw new Error('Failed to fetch subject points for weekly themes.');
  }
};

export const repoUpsertTheme = async (item) => {
  const db = await getDbInstance();

  try {
    return await db.upsertTheme(item);
  } catch (err) {
    console.error('[REPO ERROR]: repoUpsertTheme -', err.stack);
    throw new Error('Failed to upsert weekly theme.');
  }
};

export const repoGetThemes = async () => {
  const db = await getDbInstance();

  try {
    return await db.listThemes({});
  } catch (err) {
    console.error('[REPO ERROR]: repoGetThemes -', err.stack);
    throw new Error('Failed to list weekly themes.');
  }
};

export const repoArchiveOldThemes = async (keepDate) => {
  const db = await getDbInstance();
  const archiveFilter = { last_updated: { $lt: keepDate } };

  try {
    const itemsToMove = await db.listThemes(archiveFilter);

    if (itemsToMove.length > 0) {
      await db.archiveThemes(itemsToMove);
      const result = await db.deleteThemes(archiveFilter);
      console.log(
        `[REPO]: Archived and deleted ${result.deletedCount} old themes.`
      );
      return result.deletedCount;
    }

    return 0;
  } catch (err) {
    console.error('[REPO ERROR]: repoArchiveOldThemes -', err.stack);
    throw new Error('Failed to move old themes to archive.');
  }
};

// Deletes all active weekly themes from the themes collection.
export const repoDeleteAllThemes = async () => {
  const db = await getDbInstance();

  const filter = { label: { $exists: true } };

  try {
    const result = await db.deleteThemes(filter);
    return result.deletedCount || 0;
  } catch (err) {
    console.error('[REPO ERROR]: repoDeleteAllThemes -', err.stack);
    throw new Error('Failed to delete all active themes.');
  }
};

export const repoGetParticipants = async () => {
  const db = await getDbInstance();

  // Build participant filter
  const filter = {};

  try {
    const participants = await db.listParticipants(filter);

    return participants;
  } catch (error) {
    console.error('[REPO ERROR]: repoGetParticipants failed', error);
    throw new Error('Database error while fetching subjects.');
  }
}

// Moves participants not updated since `cutoff` into the old_participants
// collection so the active collection (and frontend listing) stays small.
export const repoArchiveStaleParticipants = async (cutoff) => {
  const db = await getDbInstance();

  try {
    const newsAgeCutoff = new Date(Date.now() - CUTOFF_MS);

    // ── Pass 1: archive participants not seen since cutoff or with less than 2 news ──
    const archiveFilter = {
      $or: [
        { last_updated: { $lt: cutoff } },
        { count: { $lt: 2 } }
      ]
    };

    const archivedCount = await db.archiveStaleParticipants(archiveFilter);
    console.log(`[REPO]: Archived ${archivedCount} stale participants.`);

    // ── Pass 2: prune stale news_labels from still-active participants ──────────
    const allActive = await db.listParticipants();
    const allLinks = [...new Set(allActive.flatMap(p => p.news_labels || []))];

    const newsDocs = allLinks.length > 0 ? await repoGetNewsByLinks(allLinks) : [];
    const dateByLink = new Map(
      newsDocs.filter(n => n?.link).map(n => [n.link, new Date(n.date)])
    );

    let prunedCount = 0;
    for (const participant of allActive) {
      const recentLabels = (participant.news_labels || []).filter(link => {
        const date = dateByLink.get(link);
        return date && date >= newsAgeCutoff;
      });
      const staleLabels = (participant.news_labels || []).filter(link => {
        const date = dateByLink.get(link);
        return !date || date < newsAgeCutoff;
      });

      if (staleLabels.length === 0) continue;

      // Push stale labels into archive, strip them from active
      await db.upsertOldParticipant({ ...participant, news_labels: staleLabels });
      await db.pruneActiveParticipantLabels(participant._id, recentLabels);
      prunedCount++;
    }

    console.log(`[REPO]: Pruned stale news labels from ${prunedCount} active participants.`);
    return { archived: archivedCount, pruned: prunedCount };
  } catch (err) {
    console.error('[REPO ERROR]: repoArchiveStaleParticipants -', err.stack);
    throw new Error('Failed to archive stale participants.');
  }
};

// Restores an archived participant into the active collection.
const reviveArchivedParticipant = async (db, archivedDoc, formattedName, links) => {
  const cutoff = new Date(Date.now() - CUTOFF_MS);
  const existingLabels = [...new Set((archivedDoc.news_labels || []).filter(Boolean))];

  let recentLabels = existingLabels;
  if (existingLabels.length > 0) {
    const newsDocs = await repoGetNewsByLinks(existingLabels);
    const dateByLink = new Map(
      newsDocs.filter((n) => n?.link).map((n) => [n.link, new Date(n.date)])
    );
    recentLabels = existingLabels.filter((link) => {
      const date = dateByLink.get(link);
      return date && date >= cutoff;
    });
  }

  const normalizedNew = (Array.isArray(links) ? links : [links]).filter(Boolean);
  const mergedRecentLabels = [...new Set([...recentLabels, ...normalizedNew])];

  // Archive copy gets ALL historical references merged in (full history)
  const allMergedLabels = [...new Set([...existingLabels, ...normalizedNew])];
  await db.collections.oldParticipants.updateOne(
    { _id: archivedDoc._id },
    {
      $set: { last_updated: new Date() },
      $addToSet: { news_labels: { $each: normalizedNew } },
      $inc: { count: normalizedNew.length },
    }
  );

  // Active copy gets only recent references
  const revivedDoc = {
    ...archivedDoc,
    name: formattedName,
    news_labels: mergedRecentLabels,
    count: mergedRecentLabels.length,
    last_updated: new Date(),
  };
  return db.reviveParticipant(revivedDoc);
};

export const repoInsertOrUpdateParticipant = async (name, links) => {
  const db = await getDbInstance();

  try {
    const formattedName = name.trim();

    // 1. Search the participant by name in the active collection
    const searchFilter = { name: { $regex: new RegExp(`^${name}$`, 'i') } };

    // TODO: I don't like this being here wasting time just to do a basic count
    // Im just doing this because when a news item get processed twice the count increases
    const targetLink = Array.isArray(links) ? links[0] : links;
    const existingList = await db.listParticipants(searchFilter);
    const existing = existingList[0] || null;

    // 2. Not active? Check the archive and pass it back to active if found.
    if (!existing) {
      const archivedList = await db.listOldParticipants(searchFilter);
      const archived = archivedList[0] || null;

      if (archived) {
        return await reviveArchivedParticipant(
          db,
          archived,
          formattedName,
          links
        );
      }
    }

    const isDuplicateLink = existing?.news_labels?.includes(targetLink);

    // 3. Define what to modify
    const updatePayload = {
      $set: {
        name: formattedName,
        last_updated: new Date()
      },
      $setOnInsert: {
        created_at: new Date()
      },
    };

    if (!existing || !isDuplicateLink) {
      updatePayload.$inc = { count: 1 };
    }

    // 4. Normalize link input to handle single links or an array of multiple links
    if (links) {
      const normalizedLinks = Array.isArray(links)
        ? links.filter(Boolean)
        : [links].filter(Boolean);

      if (normalizedLinks.length > 0) {
        // Use $each so MongoDB handles multiple string items atomically inside $addToSet
        updatePayload.$addToSet = {
          news_labels: { $each: normalizedLinks }
        };
      }
    }

    // 5. Run it in a single database trip
    const updatedParticipant = await db.findOneAndUpdateParticipant(searchFilter, updatePayload);

    return updatedParticipant;

  } catch (err) {
    console.error('[REPO ERROR]: repoInsertOrUpdateParticipant -', err.stack);
    throw new Error('Failed to update participant tracking metrics safely without data loss.');
  }
};

export const repoGetNewsByParticipant = async (participantId) => {
  const db = await getDbInstance();

  try {
    // 1. Ensure the incoming ID is a proper binary ObjectId instance
    const targetId = typeof participantId === 'string' ? new ObjectId(participantId) : participantId;

    // 2. Search for participant with input id
    const participantDoc = await db.getParticipant(targetId)

    if (!participantDoc) {
      console.warn(`[REPO]: No participant found with id: ${participantId}`);
      return [];
    }

    // 3. Get news by the links stored in the subject
    const newsLinks = [
      ...new Set(participantDoc.news_labels?.filter(Boolean) || []),
    ];

    if (newsLinks.length === 0) return [];

    const newsFromLinks = (await repoGetNewsByLinks(newsLinks)).filter(Boolean);
    return newsFromLinks.sort((a, b) => new Date(b.date) - new Date(a.date));

  } catch (err) {
    console.error('[REPO ERROR]: repoGetNewsByParticipant - ', err.stack);
    throw new Error('Failed to retrieve news for the specified participant.');
  }
}

