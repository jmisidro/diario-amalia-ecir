import { repoGetDailyNews } from '../repo/repo.js';

import { TOPICS, SOURCES } from '../config/constants.js';

export const controlGetTopics = async (req, res) => {
  try {
    res.status(200).json({
      topics: TOPICS,
    });
  } catch (error) {
    console.error(
      '[SYSTEM CONTROLLER ERROR]: controlGetTopics - ',
      error.message
    );
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const controlGetSources = async (req, res) => {
  try {
    res.status(200).json({
      sources: SOURCES,
    });
  } catch (error) {
    console.error(
      '[SYSTEM CONTROLLER ERROR]: controlGetSources - ',
      error.message
    );
    res.status(500).json({ error: 'internal server error' });
  }
};
