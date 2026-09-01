import express from 'express';

import {
  controlGetTopics,
  controlGetSources,
} from '../controllers/system.controller.js';

const router = express.Router();

router.get('/getTopics', controlGetTopics);

router.get('/getSources', controlGetSources);

export default router;
