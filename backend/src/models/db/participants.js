// schema for the participants collection
export const participantsSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['_id', 'name'],
    properties: {
      _id: {
        bsonType: 'objectId',
        description: 'Unique participant identifier - native MongoDB ObjectId - used globally as a database pointer',
      },
      name: {
        bsonType: 'string',
        description: 'Name of the participant',
      },
      count: {
        bsonType: 'int',
        description: 'How many news items this participant appeared in',
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
        description: 'When this participant appeared in a news item',
      },
    },
  },
};

// schema for the old participants collection
export const oldParticipantsSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['_id', 'name'],
    properties: {
      _id: {
        bsonType: 'objectId',
        description: 'Unique participant identifier - native MongoDB ObjectId - used globally as a database pointer',
      },
      name: {
        bsonType: 'string',
        description: 'Name of the participant',
      },
      count: {
        bsonType: 'int',
        description: 'How many news items this participant appeared in',
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
        description: 'When this participant appeared in a news item',
      },
    },
  },
};

