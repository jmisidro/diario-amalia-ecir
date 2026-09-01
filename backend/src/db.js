import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

import {
  newsSchema,
  oldNewsSchema,
  summarySchema,
  oldSummarySchema,
  subjectsSchema,
  oldSubjectsSchema,
  themesSchema,
  oldThemesSchema,
  participantsSchema,
  oldParticipantsSchema
} from './models/db/index.js';

dotenv.config();

class NewsDatabase {
  constructor(databaseUrl = null, databaseName = null) {
    // 1. Connection config
    const host = process.env.DB_HOST || 'db_diario';
    const port = process.env.DB_PORT || '27018';

    this.databaseUrl = databaseUrl || `mongodb://${host}:${port}`;
    this.databaseName = databaseName || process.env.DB_NAME;

    // 2. Auth Config
    const auth = {
      username: process.env.MONGO_ROOT_USER,
      password: process.env.MONGO_ROOT_PASSWORD,
    };

    // 3. Initialize client with options
    this.client = new MongoClient(this.databaseUrl, {
      auth,
      authSource: 'admin',
    });

    this.db = null;

    // TODO: Maybe pass this into env
    this.collectionNames = {
      news: 'news_items',
      oldNews: 'old_news_items',
      summaries: 'daily_summaries',
      oldSummaries: 'old_daily_summaries',
      subjects: 'subjects',
      oldSubjects: 'old_subjects',
      themes: 'themes',
      oldThemes: 'old_themes',
      participants: 'participants',
      oldParticipants: 'old_participants',
      weeklySummaries: 'weekly_summaries',
      oldWeeklySummaries: 'old_weekly_summaries',
    };

    this.collections = {};
  }

  // --- Connection ---

  async connect() {
    if (this.db) return;

    try {
      await this.client.connect();
      this.db = this.client.db(this.databaseName);

      for (const [key, name] of Object.entries(this.collectionNames)) {
        this.collections[key] = this.db.collection(name);
      }

      console.log(`MongoDB connected to '${this.databaseName}'.`);
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      throw error;
    }
  }

  async close() {
    if (this.client) {
      await this.client.close();
      console.log('MongoDB connection closed.');
    }
  }

  // --- Collection Initialization ---

  async initializeCollection(collectionName, schema) {
    try {
      await this.db.createCollection(collectionName, {
        validator: schema,
        validationAction: 'error',
        validationLevel: 'strict',
      });

      console.log(
        `Collection '${collectionName}' created with schema validation.`
      );
    } catch (error) {
      if (error.code === 48) {
        // Collection exists → update schema
        await this.db.command({
          collMod: collectionName,
          validator: schema,
          validationAction: 'error',
          validationLevel: 'strict',
        });

        console.log(`Schema validation updated for '${collectionName}'.`);
      } else {
        console.error(`Error during collection setup: ${error.message}`);
      }
    }

    const collection = this.db.collection(collectionName);

    // Should only run for the 'news' collections
    const newsCollections = [
      this.collectionNames.news,
      this.collectionNames.oldNews,
    ];

    if (newsCollections.includes(collectionName)) {
      // Unique link indexes must have unique names per collection
      await collection.createIndex(
        { link: 1 },
        { unique: true, name: `unique_${collectionName}_link_index` }
      );

      // Relational index names are isolated dynamically per collection
      await collection.createIndex(
        { subject_id: 1 },
        { name: `relational_${collectionName}_subject_id_index` }
      );
    }

    const summaryCollections = [
      this.collectionNames.summaries,
      this.collectionNames.oldSummaries,
    ];

    if (summaryCollections.includes(collectionName)) {
      // Compound key constraints unique per collection
      await collection.createIndex(
        { date: 1, topic: 1 },
        { unique: true, name: `unique_${collectionName}_date_topic_index` }
      );
    }

    const weeklySummaryCollections = [
      this.collectionNames.weeklySummaries,
      this.collectionNames.oldweeklySummaries,
    ];

    if (weeklySummaryCollections.includes(collectionName)) {
      // Unique key per collection
      // Only one summary per week
      await collection.createIndex(
        { weekStart: 1 },
        { unique: true, name: `unique_${collectionName}_weekStart_index` }
      );
    }

    if (collectionName === this.collectionNames.oldSubjects) {
      // Index for efficient date-range queries (used by weekly theme clustering)
      await collection.createIndex(
        { _id: 1, snapshot_date: 1 },
        { unique: true, name: 'unique_old_subject_id_snapshot_index' }
      );
      await collection.createIndex(
        { snapshot_date: 1 },
        { name: 'old_subjects_snapshot_date_index' }
      );
    }

    if (collectionName === this.collectionNames.oldThemes) {
      // Use snapshot_date as the key for archived themes so we can store
      // multiple snapshots (weekly) of the same theme label.
        await collection.createIndex(
        { _id: 1, snapshot_date: 1 },
        { unique: true, name: 'unique_old_theme_id_snapshot_index' }
      );

      // Index snapshot_date for efficient range queries over snapshots.
      await collection.createIndex(
        { snapshot_date: 1 },
        { name: 'old_theme_snapshot_date_index' });
    }

    if (collectionName === this.collectionNames.participants) {
      await collection.createIndex(
        { name: 1 },
        {
          unique: true,
          name: 'unique_participant_name_index',
        }
      );
    }

  // Speed up sorting logic for dashboard counters tracking metrics
  await collection.createIndex(
    { count: -1 },
    { name: 'participant_volume_count_index' }
  );
    return collection;
  }

  // --- Atomic Operations ---

  // News Item Operations

  /**
   * Retrieves a news item by its unique link.
   * @param {string} link - The unique news link.
   * @returns {object | null} The news item or null.
   */
  async getNewsItem(link) {
    return this.collections.news.findOne({ link: link });
  }

  /**
   * Deletes a news item by its unique link.
   * @param {string} link - The unique news link.
   * @returns {object} Status object.
   */
  async deleteNewsItem(link) {
    const result = await this.collections.news.deleteOne({ link: link });

    if (result.deletedCount === 1) {
      return { status: 200, message: 'News item deleted successfully.' };
    } else {
      return { status: 404, error: 'News item not found.' };
    }
  }

  /**
   * Updates an item if it exists or inserts it if not.
   * @param {object} item - The news item object.
   * @returns {object} Status object.
   */
  async insertOrUpdateNewsItem(item) {
    try {
      const result = await this.collections.news.updateOne(
        { link: item.link },
        { $set: item },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        return { inserted: true, link: item.link };
      } else {
        return { updated: true, link: item.link };
      }
    } catch (err) {
      console.error('InsertOrUpdate error:', err);
      console.dir(err.errInfo.details.schemaRulesNotSatisfied, { depth: null });
      return { error: err.message };
    }
  }

  // Daily Summary items

  /**
   * Updates an item if it exists or inserts it if not.
   * @param {object} item - The dailySummary item object.
   * @returns {object} Status object.
   */
  async insertOrUpdateDailySummaryItem(item) {
    try {
      const result = await this.collections.summaries.updateOne(
        {
          date: item.date,
          topic: item.topic,
        },
        { $set: item },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        return { inserted: true, date: item.date, topic: item.topic };
      } else {
        return { updated: true, date: item.date, topic: item.topic };
      }
    } catch (err) {
      console.error('InsertOrUpdate error:', err);
      return { error: err.message };
    }
  }

  async listSummaryItems(filter = {}) {
    return (
      this.collections.summaries
        .find(filter)
        .sort({ date: -1 }) // Sort descending (newest first)
        .toArray()
    );
  }

  async archiveSummaryItems(items) {
    if (!items || items.length === 0) {
      return { acknowledged: true, insertedCount: 0, upsert: true };
    }

    // Strip `_id` from the update payload and only apply
    // it when a new document is inserted via `$setOnInsert`.
    const operations = items.map((item) => {
      const { _id, ...rest } = item;
      return {
        updateOne: {
          filter: { date: item.date, topic: item.topic }, // Match by date and topic
          update: {
            $set: rest,
            $setOnInsert: { _id },
          },
          upsert: true, // Insert if not found
        },
      };
    });

    // We explicitly use the 'oldSummaries' handle from our collection dictionary
    return this.collections.oldSummaries.bulkWrite(operations, {
      ordered: false,
    });
  }

  async deleteSummaryItems(filter) {
    if (!filter || Object.keys(filter).length === 0) {
      throw new Error('Safety: Filter required for deleteMany');
    }

    return this.collections.summaries.deleteMany(filter);
  }

  // Weekly Summary items

  /**
   * Updates an item if it exists or inserts it if not.
   * @param {object} item - The dailySummary item object.
   * @returns {object} Status object.
   */
  async insertOrUpdateWeeklySummaryItem(item) {
    try {
      const result = await this.collections.weeklySummaries.updateOne(
        {
          weekStart: item.weekStart,
        },
        { $set: item },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        return { inserted: true, date: item.weekStart };
      } else {
        return { updated: true, date: item.weekStart };
      }
    } catch (err) {
      console.error('InsertOrUpdate error:', err);
      throw err;
    }
  }

  async listWeeklySummaryItems(filter = {}) {
    return (
      this.collections.weeklySummaries
        .find(filter)
        .sort({ date: -1 }) // Sort descending (newest first)
        .toArray()
    );
  }

  async archiveWeeklySummaryItems(items) {
    if (!items || items.length === 0) {
      return { acknowledged: true, insertedCount: 0, upsert: true };
    }

    // Strip `_id` from the update payload and only apply
    // it when a new document is inserted via `$setOnInsert`.
    const operations = items.map((item) => {
      const { _id, ...rest } = item;
      return {
        updateOne: {
          filter: { weekStart: item.weekStart }, // Match by weekStart
          update: {
            $set: rest,
            $setOnInsert: { _id },
          },
          upsert: true, // Insert if not found
        },
      };
    });

    // We explicitly use the 'oldWeeklySummaries' handle from our collection dictionary
    return this.collections.oldWeeklySummaries.bulkWrite(operations, {
      ordered: false,
    });
  }

  async deleteWeeklySummaryItems(filter) {
    if (!filter || Object.keys(filter).length === 0) {
      throw new Error('Safety: Filter required for deleteMany');
    }

    return this.collections.weeklySummaries.deleteMany(filter);
  }

  //Subject Methods

  /**
   * Retrieves subjects from the database.
   */
  async listSubjects(filter = {}) {
    return (
      this.collections.subjects
        .find(filter)
        .sort({ last_updated: -1 })
        .toArray()
    );
  }

  /**
   * Retrieves subjects from the database.
   */
  async getSubject(id) {
    return (
      this.collections.subjects.findOne({
        _id: typeof id === 'string' ? new ObjectId(id) : id
      })
    );
  }

  async getOldSubject(id) {
    return (
      this.collections.oldSubjects.findOne({
        _id: typeof id === 'string' ? new ObjectId(id) : id
      })
    );
  }

  /**
   * Creates a new subject.
   */
  async insertSubjectItem(item) {
    try {
      return await this.collections.subjects.insertOne(item);
    } catch (err) {
      console.error('InsertSubject error:', err);
      throw err;
    }
  }

  /**
   * Replaces today's oldSubjects snapshot with the current subjects.
   * Deletes all entries for snapshotDate first, then inserts fresh ones.
   * This avoids stale duplicates when cluster labels drift across reclusters.
   */
  async copySubjectsToOldSubjects(snapshotDate) {
    const items = await this.listSubjects({});

    // Always delete today's entries so no stale labels remain
    await this.collections.oldSubjects.deleteMany({ snapshot_date: snapshotDate });

    if (!items || items.length === 0) {
      return { acknowledged: true, insertedCount: 0 };
    }

    const docs = items.map((item) => ({
      ...item,
      snapshot_date: snapshotDate,
    }));

    return this.collections.oldSubjects.insertMany(docs, { ordered: false });
  }

  async copyThemesToOldThemes(snapshotDate) {
    const items = await this.listThemes({});

    // Always delete entries for this snapshot to avoid duplicates
    await this.collections.oldThemes.deleteMany({ snapshot_date: snapshotDate });

    if (!items || items.length === 0) {
      return { acknowledged: true, insertedCount: 0 };
    }

    const docs = items.map((item) => ({
      ...item,
      snapshot_date: snapshotDate,
    }));

    return this.collections.oldThemes.insertMany(docs, { ordered: false });
  }

  async listOldSubjects(filter = {}) {
    return this.collections.oldSubjects
      .find(filter)
      .sort({ snapshot_date: -1 })
      .toArray();
  }

  /**
   * Deletes ALL subjects from the database.
   * Used for full reclustering rebuild.
   */
  async deleteAllSubjects() {
    try {
      const result = await this.collections.subjects.deleteMany({});

      console.log(
        `[DB]: Deleted ${result.deletedCount} subjects from collection.`
      );

      return result;
    } catch (err) {
      console.error('DeleteAllSubjects error:', err);
      throw err;
    }
  }

  // --- Weekly Theme Methods ---

  async listThemes(filter = {}) {
    return this.collections.themes
      .find(filter)
      .sort({ last_updated: -1 })
      .toArray();
  }

  async upsertTheme(item) {
    if (!item._id) {
      throw new Error('upsertTheme requires a pre-generated _id on the item.');
    }

    try {
      const { _id, created_at, ...rest } = item;
      delete rest._id;

      return await this.collections.themes.updateOne(
        { _id },
        {
          $set: rest, // updates label, centroid, count, subject_ids, last_updated
          $setOnInsert: {
            created_at: created_at || new Date(),
          },
        },
        { upsert: true }
      );
    } catch (err) {
      console.error('UpsertTheme error:', err);
      throw err;
    }
  }

  async archiveThemes(items) {
    if (!items || items.length === 0) {
      return { acknowledged: true, insertedCount: 0, upsert: true };
    }

    const archivedAt = new Date();
    const operations = items.map((item) => {
      const { _id, ...rest } = item;
      return {
        updateOne: {
          filter: { label: item.label, last_updated: item.last_updated },
          update: {
            $set: { ...rest, archived_at: archivedAt },
            $setOnInsert: { _id },
          },
          upsert: true,
        },
      };
    });

    return this.collections.oldThemes.bulkWrite(operations, {
      ordered: false,
    });
  }

  async deleteThemes(filter) {
    if (!filter || Object.keys(filter).length === 0) {
      throw new Error('Safety: Filter required for deleteMany');
    }

    return this.collections.themes.deleteMany(filter);
  }

  // --- Participants Methods ---

  async getParticipant(id) {
    return (
      this.collections.participants.findOne({
        _id: typeof id === 'string' ? new ObjectId(id) : id
      })
    );
  }

  async listParticipants(filter = {}) {
    return this.collections.participants
      .find(filter)
      .sort({ last_updated: -1 })
      .toArray();
  }

  async listOldParticipants(filter = {}) {
    return this.collections.oldParticipants
      .find(filter)
      .sort({ last_updated: -1 })
      .toArray();
  }

  /**
   * Moves participants whose last_updated is older than `cutoff` into the
   * oldParticipants collection, then removes them from the active collection.
   * @param {Date} cutoff - Participants older than this date are archived.
   * @returns {number} How many participants were archived.
   */
  async archiveStaleParticipants(filter) {
    const stale = await this.collections.participants.find(filter).toArray();
    if (!stale.length) return 0;

    const operations = stale.map((item) => {
      const { _id, news_labels, count, ...rest } = item;
      return {
        updateOne: {
          filter: { _id },
          update: {
            $set: rest,
            $inc: { count: count || 0 },
            $addToSet: { news_labels: { $each: news_labels || [] } }, // append
          },
          upsert: true,
        },
      };
    });

    await this.collections.oldParticipants.bulkWrite(operations, { ordered: false });
    const result = await this.collections.participants.deleteMany(filter);
    return result.deletedCount;
  }

  /**
   * Restores an archived participant: inserts it back into the active collection and removes it from oldParticipants.
   * @param {object} doc - The fully-formed participant document to restore.
   * @returns {object} The restored document.
   */
  async reviveParticipant(doc) {
    await this.collections.participants.insertOne(doc);
    return doc;
  }

  /**
   * Creates a new participant.
   */
  async insertParticipant(item) {
    try {
      return await this.collections.participant.insertOne(item);
    } catch (err) {
      console.error('InsertParticipant error:', err);
      throw err;
    }
  }

  /**
   * Update or insert a participant.
   */
  async findOneAndUpdateParticipant(filter, updatePayload) {
    try {
      const result = await this.collections.participants.findOneAndUpdate(
        filter,
        updatePayload,
        {
          upsert: true,
          returnDocument: 'after' // Return the fully updated/inserted document
        }
      );

      // Response variations
      return result.value || result;
    } catch (err) {
      console.error('Database Layer - findOneAndUpdateParticipant error:', err);
      throw err;
    }
  }

  /**
   * Appends news_labels into an oldParticipants record (upserts if not found).
   * @param {object} participant - Participant doc with news_labels to append.
   */
  async upsertOldParticipant(participant) {
    const { _id, news_labels, count, ...rest } = participant;
    return this.collections.oldParticipants.updateOne(
      { _id },
      {
        $set: rest,
        $addToSet: { news_labels: { $each: news_labels || [] } },
      },
      { upsert: true }
    );
  }

  /**
   * Updates the news_labels and count of an active participant.
   * @param {ObjectId} _id - The participant's _id.
   * @param {string[]} recentLabels - The filtered list of recent news URLs to keep.
   */
  async pruneActiveParticipantLabels(_id, recentLabels) {
    return this.collections.participants.updateOne(
      { _id },
      { $set: { news_labels: recentLabels, count: recentLabels.length } }
    );
  }

  // --- Batch Operations ---

  // News Item Operations

  async listNewsItems(filter = {}) {
    return (
      this.collections.news
        .find(filter)
        .sort({ date: -1 }) // Sort descending (newest first)
        .toArray()
    );
  }

  async listPastNewsItems(filter = {}) {
    return this.collections.oldNews
      .find(filter)
      .sort({ date: -1 })
      .toArray();
  }

  /**
   * Deletes items and returns the raw Mongo result: { acknowledged, deletedCount }
   */
  async deleteNewsItems(filter) {
    if (!filter || Object.keys(filter).length === 0) {
      throw new Error('Safety: Filter required for deleteMany');
    }

    return this.collections.news.deleteMany(filter);
  }

  /**
   * Batch archives items into the oldNews collection.
   * @param {Array} items - Array of news items to archive.
   * @returns {object} Raw Mongo result.
   */
  async archiveNewsItems(items) {
    if (!items || items.length === 0) {
      return { acknowledged: true, insertedCount: 0, upsert: true };
    }

    // When we copy documents from the "news" collection we carry the
    // original `_id` field along with all of the other properties.  the
    // problem surfaces when we run this batch more than once: the first
    // time an item is upserted into the `oldNews` collection the stored
    // document receives the same `_id` as the source document.  on
    // subsequent runs the operation below will match by `link` but the
    // `$set` stage still contains `item._id`.  if the existing archived
    // record has a different ObjectId (for example because the previous
    // upsert generated its own id) the update attempts to change an
    // immutable field, which is what you're seeing in the logs.
    //
    // To avoid that we strip `_id` from the update payload and only apply
    // it when a new document is inserted via `$setOnInsert`.
    const operations = items.map((item) => {
      const { _id, ...rest } = item;
      return {
        updateOne: {
          filter: { link: item.link },
          update: {
            $set: rest,
            $setOnInsert: { _id },
          },
          upsert: true, // Insert if not found
        },
      };
    });

    // We explicitly use the 'oldNews' handle from our collection dictionary
    return this.collections.oldNews.bulkWrite(operations, { ordered: false });
  }

  // Daily Summary Operations

  async listDailySummaryItems(filter = {}, limit = 200) {
    return this.collections.summaries
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async listPastDailySummaryItems(filter = {}, limit = 200) {
    return this.collections.oldSummaries
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Deletes items and returns the raw Mongo result: { acknowledged, deletedCount }
   */
  async deleteSummaryItems(filter) {
    if (!filter || Object.keys(filter).length === 0) {
      throw new Error('Safety: Filter required for deleteMany');
    }

    return this.collections.summaries.deleteMany(filter);
  }

  // WeeklySummary Operations

  async listWeeklySummaryItems(filter = {}, limit = 200) {
    return this.collections.weeklySummaries
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async listPastWeeklySummaryItems(filter = {}, limit = 200) {
    return this.collections.oldWeeklySummaries
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Deletes items and returns the raw Mongo result: { acknowledged, deletedCount }
   */
  async deleteWeeklySummaryItems(filter) {
    if (!filter || Object.keys(filter).length === 0) {
      throw new Error('Safety: Filter required for deleteMany');
    }

    return this.collections.weeklySummaries.deleteMany(filter);
  }
}

/**
 * Creates, connects, and initializes the MongoDB database instance.
 * @returns {Promise<NewsDatabase>} The connected database instance.
 */
async function initializeDB() {
  const dbInstance = new NewsDatabase();

  try {
    await dbInstance.connect();

    // Initialize collections with their schemas and indexes
    await dbInstance.initializeCollection(
      dbInstance.collectionNames.news,
      newsSchema
    );
    await dbInstance.initializeCollection(
      dbInstance.collectionNames.oldNews,
      oldNewsSchema
    );
    await dbInstance.initializeCollection(
      dbInstance.collectionNames.summaries,
      summarySchema
    );
    await dbInstance.initializeCollection(
      dbInstance.collectionNames.oldSummaries,
      oldSummarySchema
    );
    await dbInstance.initializeCollection(
      dbInstance.collectionNames.subjects,
      subjectsSchema
    );
    await dbInstance.initializeCollection(
      dbInstance.collectionNames.oldSubjects,
      oldSubjectsSchema
    );
    await dbInstance.initializeCollection(
      dbInstance.collectionNames.themes,
      themesSchema
    );
    await dbInstance.initializeCollection(
      dbInstance.collectionNames.oldThemes,
      oldThemesSchema
    );

    return dbInstance;
  } catch (error) {
    console.error(
      'FATAL ERROR: Failed to initialize and connect the database.',
      error
    );
    // Exit the process on a database failure
    process.exit(1);
  }
}

export default initializeDB;
