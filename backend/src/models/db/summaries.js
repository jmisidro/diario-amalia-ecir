// Same logic applies to the summary schemas
export const summarySchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['date', 'topic', 'dailySummary'],
    properties: {
      date: {
        bsonType: 'date', // ISODate object
        description: 'The day of the dailySummary.',
      },
      topic: {
        bsonType: 'string', //(all) sem topico
        description: 'Topic of the daily summary.',
      },
      dailySummary: {
        bsonType: 'string',
        description: 'Summary of the daily news related to the topic.',
      },
      createdAt:  {
        bsonType: 'date', // ISODate object
        description: 'The time of creation of this Summary.',
      },
    },
  },
};

export const oldSummarySchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['date', 'topic', 'dailySummary'],
    properties: {
      date: {
        bsonType: 'date', // ISODate object
        description: 'The day of the dailySummary.',
      },
      topic: {
        bsonType: 'string',
        description: 'Topic of the daily summary.',
      },
      dailySummary: {
        bsonType: 'string',
        description: 'Summary of the daily news related to the topic.',
      },
      createdAt:  {
        bsonType: 'date', // ISODate object
        description: 'The time of creation of this Summary.',
      },
    },
  },
};
