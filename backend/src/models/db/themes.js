// Schema for active weekly themes (derived from subjects from the last 7 days).
export const themesSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['_id', 'label', 'centroid', 'count', 'last_updated', 'subject_ids'],
    properties: {
      _id: {
        bsonType: 'objectId',
        description: 'Unique subject identifier - native MongoDB ObjectId - used globally as a database pointer',
      },
      label: {
        bsonType: 'string',
        description: 'Human-readable label for this weekly theme.',
      },
      centroid: {
        bsonType: 'array',
        description: 'Semantic centroid vector of the weekly theme.',
        items: {
          bsonType: 'double',
        },
      },
      count: {
        bsonType: 'int',
        description: 'How many subject points belong to this theme.',
      },
      subject_ids: {
        bsonType: 'array',
        description: '"Foreign key pointers" matching the string _id fields of the related subjects.',
        items: {
          bsonType: 'objectId',
        },
      },
      created_at: {
        bsonType: 'date',
        description: 'When this theme was first created.',
      },
      last_updated: {
        bsonType: 'date',
        description: 'When this theme was last recalculated.',
      },
    },
  },
};

// Archived weekly themes (moved from themes when stale for more than 7 days).
export const oldThemesSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['_id','label', 'centroid', 'count', 'last_updated', 'subject_ids'],
    properties: {
      _id: {
        bsonType: 'objectId',
        description: 'Unique subject identifier - native MongoDB ObjectId - used globally as a database pointer',
      },
      label: {
        bsonType: 'string',
        description: 'Human-readable label for this archived weekly theme.',
      },
      centroid: {
        bsonType: 'array',
        description: 'Semantic centroid vector of the archived weekly theme.',
        items: {
          bsonType: 'double',
        },
      },
      count: {
        bsonType: 'int',
        description: 'How many subject points belonged to this theme.',
      },
      subject_ids: {
        bsonType: 'array',
        description: '"Foreign key pointers" matching the string _id fields of the related subjects.',
        items: {
          bsonType: 'objectId',
        },
      },
      created_at: {
        bsonType: 'date',
        description: 'When this theme was first created.',
      },
      last_updated: {
        bsonType: 'date',
        description: 'When this theme was last recalculated before archiving.',
      },
      archived_at: {
        bsonType: 'date',
        description: 'When this theme was moved to oldThemes.',
      },
      snapshot_date: {
        bsonType: 'date',
        description: 'Week start date used as the snapshot key for oldThemes.',
      },
    },
  },
};
