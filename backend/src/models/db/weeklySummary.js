export const weeklySummarySchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['createdAt', 'weekStart', 'weeklySummary'],
    properties: {
      createdAt:  {
        bsonType: 'date', // ISODate object
        description: 'The time of creation of this Summary.',
      },
      weekStart: {
        bsonType: 'date', // ISODate object
        description: 'The weeks monday.',
      },
      weeklySummary: {
        bsonType: 'string',
        description: 'Summary of the weekly subjects.',
      },
    },
  },
};

export const oldWeeklySummarySchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['createdAt', 'weekStart', 'weeklySummary'],
    properties: {
      createdAt:  {
        bsonType: 'date', // ISODate object
        description: 'The time of creation of this Summary.',
      },
      weekStart: {
        bsonType: 'date', // ISODate object
        description: 'The weeks monday.',
      },
      weeklySummary: {
        bsonType: 'string',
        description: 'Summary of the weekly subjects.',
      },
    },
  },
};

