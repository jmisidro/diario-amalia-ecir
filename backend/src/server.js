import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import cron from 'node-cron';
import * as Sentry from '@sentry/node';

import userRoutes from './routes/user.routes.js';
import systemRoutes from './routes/system.routes.js';
import { processNewsFeeds } from './services/parser.js';
import {
  serviceGenerateDailySummaries,
  serviceGenerateWeeklySummaries,
  serviceArchiveOldNews,
  serviceReclusterAllNews,
  serviceArchiveOldSummaries,
  serviceArchiveWeeklyOldSummaries,
  serviceArchiveStaleParticipants,
  serviceSnapshotSubjects,
  serviceReclusterWeeklyThemes,
  serviceSnapshotThemes,
} from './services/services.js';


dotenv.config();

const PORT = process.env.API_PORT;
const app = express();

// MIDDLEWARE
app.use(express.json());
app.use(cookieParser());

app.use(express.static('public'));
app.use('/api/user', userRoutes);
app.use('/api/system', systemRoutes);

Sentry.setupExpressErrorHandler(app);

let isTaskRunning = false;

// --- Cron Job Configuration ---
const runDailyTasks = async () => {
  if (isTaskRunning) {
    console.log('[CRON] Skip: Task already in progress.');
    return;
  }

  isTaskRunning = true;
  console.log('[CRON] Lock closed.');

  try {
    console.log('[CRON] --- Starting Full Sequence ---');

    // 1. Wait for Parser
    console.log('[CRON] Phase 1: Parsing News...');
    await processNewsFeeds();
    console.log('[CRON] Phase 1 Complete.');

    // 2. Cluster All News
    console.log('[CRON] Phase 2: Rebuilding clusters...');
    await serviceReclusterAllNews();
    console.log('[CRON] Phase 2 Complete.');

    // 3. Snapshot subjects into oldSubjects
    console.log('[CRON] Phase 3: Snapshotting subjects...');
    await serviceSnapshotSubjects();
    console.log('[CRON] Phase 3 Complete.');

    // 4. Snapshot current themes into oldThemes
    console.log('[CRON] Phase 4: Snapshotting current themes (weekly)...');
    await serviceSnapshotThemes();
    console.log('[CRON] Phase 4 Complete.');

    // 5. Rebuild weekly themes from last 7 days of subjects
    console.log('[CRON] Phase 5: Rebuilding weekly themes...');
    await serviceReclusterWeeklyThemes();
    console.log('[CRON] Phase 5 Complete.');

    // 6. Archive Old News
    console.log('[CRON] Phase 6: Archiving old news...');
    await serviceArchiveOldNews();
    console.log('[CRON] Phase 6 Complete.');

    // 7. Archive Old Summaries
    console.log('[CRON] Phase 7: Archiving old summaries...');
    await serviceArchiveOldSummaries();
    console.log('[CRON] Phase 7 Complete.');

    // 8. Archive Old Weekly Summaries
    console.log('[CRON] Phase 8: Archiving old summaries...');
    await serviceArchiveWeeklyOldSummaries();
    console.log('[CRON] Phase 8 Complete.');

    // 9. Archive Stale Participants
    console.log('[CRON] Phase 9: Archiving stale participants...');
    await serviceArchiveStaleParticipants();
    console.log('[CRON] Phase 9 Complete.');

    // 10. Wait for Summarization
    console.log('[CRON] Phase 10: Generating Summaries...');
    await serviceGenerateDailySummaries();
    console.log('[CRON] Phase 10 Complete.');

    // 11. Wait for Weekly Summarization
    console.log('[CRON] Phase 11: Generating Weekly Summaries...');
    await serviceGenerateWeeklySummaries();
    console.log('[CRON] Phase 11 Complete.');

    console.log('[CRON] --- All Tasks Finished Successfully ---');
  } catch (err) {
    console.error('[CRON] Sequence failed at some stage:', err);
  } finally {
    isTaskRunning = false;
    console.log('[CRON] Lock opened.');
  }
};

// Run it on server startup
runDailyTasks();

// Runs every 15 min
cron.schedule('*/15 * * * *', () => {
  console.log('[CRON] Triggering 15-minute scheduled update...');
  runDailyTasks();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server Running on port ${PORT}`);
});
