import { useState, useEffect, useCallback } from 'react';
import useApi from '../utils/useApi';
import { WeeklyThemesResponse } from '@/lib/types';

const useGetWeeklyThemes = (date?: string) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [themesData, setThemesData] = useState<WeeklyThemesResponse | null>(null);
  const { request } = useApi();

  const getThemes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      const query = params.toString();
      const path = query ? `/user/getWeeklyThemes?${query}` : '/user/getWeeklyThemes';

      const data = await request<WeeklyThemesResponse>(path);
      setThemesData(data);
    } catch (error: any) {
      console.error('[ERROR]: useGetWeeklyThemes - ', error);
    } finally {
      setLoading(false);
    }
  }, [date, request]);

  useEffect(() => {
    getThemes();
  }, [getThemes]);

  return { loading, themesData, setThemesData, getThemes };
};

export default useGetWeeklyThemes;
