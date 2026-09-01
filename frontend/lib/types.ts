export interface Topic {
  name: string;
  count: number;
}

export interface NewsArticle {
  _id: string;
  title: string;
  site_name: string;
  link: string;
  date: string;
  topics: {
    name: string;
    rank: number;
  }[];
  summary: string;
  author: string;
  score?: {
    relevance: number;
    proximity: number;
    novelty: number;
    actuality: number;
    continuity: number;
    notoriety: number;
    negativity: number;
    index: number;
    classification: 'BAIXO' | 'MÉDIO' | 'ALTO';
    justification?: string | null;
  } | null;
}

export interface NewsResponse {
  news: NewsArticle[];
}

export interface DailySummary {
  summary: string
  articleCount: number
  topTopics: Topic[]
  createdAt: string | undefined
}

export interface WeeklySummary {
  summary: string
  articleCount: number
  createdAt: string | undefined
}

export interface TopicsResponse {
  topics: string[];
}

export interface SourcesResponse {
  sources: string[];
}

export interface ChatReference {
  id: string
  title: string
  summary: string
  source: string
  sourceUrl: string
  topics: string[]
  publishedAt: string
  relevanceScore: number
}

export interface ChatResponse {
  message: string
  timestamp: string
  references: ChatReference[]
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  references?: ChatReference[]
}

export interface ChatSession {
  id: string
  title: string
  customTitle?: boolean // true if user manually renamed the session
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface MarkdownMessageProps {
  content: string
  references: ChatReference[]
  onCitationClick?: (refIndex: number) => void
}

export interface CitationChipProps {
  index: number
  onClick: () => void
}


export interface Subject {
  _id: string;
  snapshot_date?: string; // Present on OldSubjects snapshots
  label: string;
  count: number;
  news_labels: string[];
  score: number;
  topics: {
    name: string;
    rank: number;
  }[];
  created_at: string;
  last_updated: string;
}

export interface SubjectsResponse {
  subjects: Subject[];
}

export interface Theme {
  _id: string;
  label: string;
  count: number;
  subject_ids: string[];
  created_at: string;
  last_updated: string;
}

export interface OldTheme extends Theme {
  archived_at: Date;
  snapshot_date: Date;
}

export interface WeeklyThemesResponse {
  weekStart: string;
  weekEnd: string;
  themes: Theme[];
  subjects: Subject[];
}

export interface Participant {
  _id: string;
  name: string;
  count: number;
  news_labels: string[];
  created_at: string;
  last_updated: string;
}

export interface ParticipantsResponse {
  participants: Participant[];
}
