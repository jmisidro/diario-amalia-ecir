import express from 'express';
// We would use this if we had authentication
// import protectRoute from "../middleware/protectRoute.js";

import {
  controlGetDailyNews,
  controlGetDailySummary,
  controlGetWeeklySummary,
  controlSearchNews,
  controlGetSubjects,
  controlGetNewsBySubject,
  controlGetWeeklyThemes,
  controlChat,
  controlChatDirect,
  controlGetParticipants,
  controlGetNewsByParticipant,
} from '../controllers/user.controller.js';

const router = express.Router();

// router.get("/getDailyNews", protectRoute, controlGetDailyNews);
router.get('/getDailyNews', controlGetDailyNews);

router.get('/getDailySummary', controlGetDailySummary);

router.get('/getWeeklySummary', controlGetWeeklySummary);

// used for search engine
router.get('/search', controlSearchNews);

// Weekly themes
router.get('/getWeeklyThemes', controlGetWeeklyThemes);

// Subjects
router.get('/getSubjects', controlGetSubjects);

router.get('/getNewsBySubject', controlGetNewsBySubject);

// Participants
router.get('/getParticipants', controlGetParticipants);

router.get('/getNewsByParticipant', controlGetNewsByParticipant);

// Chat Route
router.post('/chat', controlChat);
router.post('/chat_direct', controlChatDirect);

export default router;
