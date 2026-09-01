//schema for the subjects collection (active clusters, rebuilt every 15 min)
export const subjectsSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['_id', 'label', 'centroid', 'count'],
    properties: {
      _id: {
        bsonType: 'objectId',
        description: 'Unique subject identifier - native MongoDB ObjectId - used globally as a database pointer',
      },
      label: {
        bsonType: 'string',
        description: 'Human-readable label for this subject (medoid news title)',
      },
      centroid: {
        bsonType: 'array',
        description: 'Semantic centroid vector of the cluster',
        items: {
          bsonType: 'double',
        },
      },
      count: {
        bsonType: 'int',
        description: 'How many news articles belong to this cluster',
      },
      news_labels: {
        bsonType: 'array',
        description: 'Links of news items currently grouped in this subject.',
        items: {
          bsonType: 'string',
        },
      },
      created_at: {
        bsonType: 'date',
        description: 'When this subject was first created',
      },
      last_updated: {
        bsonType: 'date',
        description: 'When a news item was last added',
      },
      topics: {
        bsonType: 'array',
        description: 'Ranked topics, average from the articles',
        items: {
          bsonType: 'object',
          required: ['name', 'rank'],
          properties: {
            name: { bsonType: 'string' },
            rank: { bsonType: 'int', minimum: 1, maximum: 3 }
          }
        }
      },
      score: {
        bsonType: ['int'],
        description: 'Public Interest Index average of the news articles included in subject',
      },
    },
  },
};

// Schema for the oldSubjects collection.
// Each document is a snapshot of one subject from a past day.
// Unique key is { snapshot_date, label } — label is the stable medoid title.
export const oldSubjectsSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['_id', 'snapshot_date', 'label', 'centroid', 'count'],
    properties: {
      _id: {
        bsonType: 'objectId',
        description: 'Unique subject identifier - native MongoDB ObjectId - used globally as a database pointer',
      },
      snapshot_date: {
        bsonType: 'date',
        description: 'The calendar day (time zeroed) this snapshot was taken.',
      },
      label: {
        bsonType: 'string',
        description: 'Human-readable label at snapshot time.',
      },
      centroid: {
        bsonType: 'array',
        description: 'Semantic centroid vector at snapshot time.',
        items: {
          bsonType: 'double',
        },
      },
      count: {
        bsonType: 'int',
        description: 'How many news articles belonged to this cluster.',
      },
      news_labels: {
        bsonType: 'array',
        description: 'Links of news items that belonged to this subject at snapshot time.',
        items: {
          bsonType: 'string',
        },
      },
      created_at: {
        bsonType: 'date',
        description: 'When the original subject was first created.',
      },
      last_updated: {
        bsonType: 'date',
        description: 'When the original subject was last updated.',
      },
      topics: {
        bsonType: 'array',
        description: 'Ranked topics, average from the articles',
        items: {
          bsonType: 'object',
          required: ['name', 'rank'],
          properties: {
            name: { bsonType: 'string' },
            rank: { bsonType: 'int', minimum: 1, maximum: 3 }
          }
        }
      },
      score: {
        bsonType: ['int'],
        description: 'Public Interest Index average of the news articles included in subject',
      },
    },
  },
};

