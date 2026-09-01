import { useState, useCallback } from 'react';
import useApi from '../utils/useApi';
import { NewsArticle } from '@/lib/types';
import { sanitizeNews } from '@/lib/utils';

const useSearchNews = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<NewsArticle[]>([]);
  const { request } = useApi();

  const searchNews = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await request<{ results: any[] }>(`/user/search?q=${encodeURIComponent(query)}`);

      const sanitized = (data.results || []).map(sanitizeNews);
      setResults(sanitized);
    } catch (error) {
      console.error('[ERROR]: useSearchNews - ', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [request]);

  const clearSearch = () => setResults([]);

  return { loading, results, searchNews, clearSearch };
};

export default useSearchNews;
