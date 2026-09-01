export const newsSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['site_name', 'link', 'title', 'date'],
    properties: {
      site_name: {
        bsonType: 'string',
        description: 'The name of the publishing site.',
      },
      link: {
        bsonType: 'string',
        description:
          'The unique URL for this news article. Used as the primary lookup key.',
      },
      title: {
        bsonType: 'string',
        description: 'The article title.',
      },
      date: {
        bsonType: 'date',
        description: 'The publication date of the article.',
      },
      categories: {
        bsonType: 'array',
        description: 'Categories of the article.',
      },
      summary: {
        bsonType: 'string',
        description: 'A short summary or resume of the article.',
      },
      author: {
        bsonType: 'string',
        description: 'The author of the article',
      },
      topics: {
        bsonType: 'array',
        description: 'Ranked topics of the article. 1st most relevant, 2nd...',
        items: {
          bsonType: 'object',
          required: ['name', 'rank'],
          properties: {
            name: { bsonType: 'string' },
            rank: { bsonType: 'int', minimum: 1, maximum: 3 }
          }
        }
      },
      subject_id: {
        bsonType: ['objectId', 'null'],
        description: 'ObjectId of the subject this news item belongs to (matches subjects._id)',
      },
      participant_ids: {
        bsonType: 'array',
        description: 'Array of native ObjectIds linking directly to the participants collection records.',
        items: {
          bsonType: 'objectId',
        },
      },
      embedding: {
        bsonType: 'array',
        description: 'Vector embedding of the news title',
      },
      score: {
        bsonType: ['object', 'null'],
        description: 'Public Interest Index scoring of the article.',
        properties: {
          relevance: { bsonType: 'int', description: 'Relevance score (1-5)' },
          proximity: {
            bsonType: 'int',
            description: 'Proximity score (1-5)',
          },
          novelty: { bsonType: 'int', description: 'Novelty score (1-5)' },
          actuality: { bsonType: 'int', description: 'Actuality score (1-5)' },
          continuity: {
            bsonType: 'int',
            description: 'Continuity score (1-5)',
          },
          notoriety: {
            bsonType: 'int',
            description: 'Notoriety score (1-5)',
          },
          negativity: {
            bsonType: 'int',
            description: 'Negativity score (1-5)',
          },
          index: {
            bsonType: 'int',
            description: 'Weighted Public Interest Index (9-45)',
          },
          classification: {
            bsonType: 'string',
            description: 'BAIXO | MÉDIO | ALTO',
          },
          justification: {
            bsonType: ['string', 'null'],
            description: 'LLM justification for the scores',
          },
        },
      },
    },
  },
};

// This schema will serve to store the news that are not related to the current day
// This will be helpful for speed in daily news access
// This way we dont have to filter out the old news every API call
// At the end of every day, the daily news will be dumped here and the daily news schema will be emptied
export const oldNewsSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['site_name', 'link', 'title', 'date'],
    properties: {
      site_name: {
        bsonType: 'string',
        description: 'The name of the publishing site.',
      },
      link: {
        bsonType: 'string',
        description:
          'The unique URL for this news article. Used as the primary lookup key.',
      },
      title: {
        bsonType: 'string',
        description: 'The article title.',
      },
      date: {
        bsonType: 'date',
        description: 'The publication date of the article.',
      },
      categories: {
        bsonType: 'array',
        description: 'Categories of the article.',
      },
      summary: {
        bsonType: 'string',
        description: 'A short summary or resume of the article.',
      },
      author: {
        bsonType: 'string',
        description: 'The author of the article',
      },
      topics: {
        bsonType: 'array',
        description: 'Ranked topics of the article. 1st most relevant, 2nd...',
        items: {
          bsonType: 'object',
          required: ['name', 'rank'],
          properties: {
            name: { bsonType: 'string' },
            rank: { bsonType: 'int', minimum: 1, maximum: 3 }
          }
        }
      },
      subject_id: {
        bsonType: ['objectId', 'null'],
        description: 'ObjectId of the subject this news item belongs to (matches subjects._id)',
      },
      participant_ids: {
        bsonType: 'array',
        description: 'Array of native ObjectIds linking directly to the participants collection records.',
        items: {
          bsonType: 'objectId',
        },
      },
      embedding: {
        bsonType: 'array',
        description: 'Vector embedding of the news title',
      },
      score: {
        bsonType: ['object', 'null'],
        description: 'Public Interest Index scoring of the article.',
        properties: {
          relevance: { bsonType: 'int', description: 'Relevance score (1-5)' },
          proximity: {
            bsonType: 'int',
            description: 'Proximity score (1-5)',
          },
          novelty: { bsonType: 'int', description: 'Novelty score (1-5)' },
          actuality: { bsonType: 'int', description: 'Actuality score (1-5)' },
          continuity: {
            bsonType: 'int',
            description: 'Continuity score (1-5)',
          },
          notoriety: {
            bsonType: 'int',
            description: 'Notoriety score (1-5)',
          },
          negativity: {
            bsonType: 'int',
            description: 'Negativity score (1-5)',
          },
          index: {
            bsonType: 'int',
            description: 'Weighted Public Interest Index (9-45)',
          },
          classification: {
            bsonType: 'string',
            description: 'BAIXO | MÉDIO | ALTO',
          },
          justification: {
            bsonType: ['string', 'null'],
            description: 'LLM justification for the scores',
          },
        },
      },
    },
  },
};
