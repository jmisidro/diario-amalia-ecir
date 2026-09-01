import { useState, useEffect, useCallback } from 'react';
import useApi from '../utils/useApi';
import { NewsArticle, NewsResponse } from '@lib/types';
import { sanitizeNews } from '@/lib/utils';

const useGetDailyNews = (topic: string = 'all', source: string = 'all', date?: string) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const { request } = useApi();

  const getNews = useCallback(async () => {
    setLoading(true);
    try {

      const params = new URLSearchParams();
      if (topic) params.append('topic', topic);
      if (source) params.append('source', source);
      if (date) params.append('date', date);

      const data = await request<NewsResponse>(`/user/getDailyNews?${params.toString()}`);

      // Sanitize with fallbacks
      const sanitized = (data.news || []).map(sanitizeNews);

      setNews(sanitized);
    } catch (error: any) {
      console.error('[ERROR]: useGetDailyNews - ', error);
      // NOTE: We don't need toast.error(error.message) here
      // useApi already shows a toast on failure!
    } finally {
      setLoading(false);
    }
  }, [request, topic, source, date]);

  useEffect(() => {
    getNews();
  }, [getNews]);

  return { loading, news, setNews, getNews };
};

export default useGetDailyNews;
