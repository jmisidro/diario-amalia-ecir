import { useState, useCallback } from 'react';
import useApi from '../utils/useApi';
import { NewsArticle } from '@/lib/types';
import { sanitizeNews } from '@/lib/utils';

const useGetNewsByParticipant = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<NewsArticle[]>([]);
  const { request } = useApi();

  const fetchByParticipant = useCallback(async (participantId: string) => {
    if (!participantId || !participantId.trim()) return;

    setLoading(true);
    setResults([]);
    try {
      const params = new URLSearchParams();
      params.append('participantId', participantId.trim());

      const data = await request<{ news: NewsArticle[] }>(
        `/user/getNewsByParticipant?${params.toString()}`
      );

      const sanitized = (data.news || []).map(sanitizeNews);
      setResults(sanitized);
    } catch (error) {
      console.error('[ERROR]: useGetNewsByParticipant - ', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [request]);

  const clearResults = () => setResults([]);

  return { loading, results, fetchByParticipant, clearResults };
};

export default useGetNewsByParticipant;
