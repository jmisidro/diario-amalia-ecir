import { useState, useEffect, useCallback } from 'react';
import useApi from '../utils/useApi';
import { WeeklySummary } from '@/lib/types';

const useGetWeeklySummary = (topic: string = 'all', date?: string) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const { request } = useApi();

  const getSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);

      const data = await request<Partial<WeeklySummary>>(`/user/getWeeklySummary?${params.toString()}`);

      setSummary({
        summary: data?.summary || "Resumo semanal das notícias não disponível",
        articleCount: data?.articleCount || 0,
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

export default useGetWeeklySummary;
