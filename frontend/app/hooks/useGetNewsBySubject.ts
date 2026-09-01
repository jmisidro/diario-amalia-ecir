import { useState, useCallback } from 'react';
import useApi from '../utils/useApi';
import { NewsArticle } from '@/lib/types';
import { sanitizeNews } from '@/lib/utils';

const useGetNewsBySubject = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<NewsArticle[]>([]);
  const { request } = useApi();

  const fetchBySubject = useCallback(async (subjectId: string) => {
    if (!subjectId || !subjectId.trim()) return;

    setLoading(true);
    setResults([]);
    try {
      const params = new URLSearchParams();
      params.append('subjectId', subjectId.trim());

      const data = await request<{ news: NewsArticle[] }>(
        `/user/getNewsBySubject?${params.toString()}`
      );

      const sanitized = (data.news || []).map(sanitizeNews);
      setResults(sanitized);
    } catch (error) {
      console.error('[ERROR]: useGetNewsBySubject - ', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [request]);

  const clearResults = () => setResults([]);

  return { loading, results, fetchBySubject, clearResults };
};

export default useGetNewsBySubject;
