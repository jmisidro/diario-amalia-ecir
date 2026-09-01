import { useState, useEffect, useCallback } from 'react';
import useApi from '../utils/useApi';
import { DailySummary } from '@/lib/types';

const useGetDailySummary = (topic: string = 'all', date?: string) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const { request } = useApi();

  const getSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (topic) params.append('topic', topic);
      if (date) params.append('date', date);

      const data = await request<Partial<DailySummary>>(`/user/getDailySummary?${params.toString()}`);

      setSummary({
        summary: data?.summary || "Resumo diário das notícias não disponível",
        articleCount: data?.articleCount || 0,  //o backend não devolve isto
        topTopics: data?.topTopics || [],
        createdAt: data?.createdAt || new Date().toISOString(),
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [request, topic, date]);

  useEffect(() => {
    getSummary();
  }, [getSummary]);

  return { loading, summary, setSummary, getSummary };
};

export default useGetDailySummary;