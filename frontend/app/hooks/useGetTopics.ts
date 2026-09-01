import { useState, useEffect, useCallback } from 'react';
import useApi from '../utils/useApi';
import { TopicsResponse } from '@lib/types';

const useGetTopics = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [topics, setTopics] = useState<string[]>([]);
  const { request } = useApi();

  const getTopics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request<TopicsResponse>(`/system/getTopics`);

      setTopics(data?.topics || []);
    } catch (error: any) {
      console.error('[ERROR]: useGetTopics - ', error.message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    getTopics();
  }, [getTopics]);

  return { loading, topics, setTopics, getTopics };
};

export default useGetTopics;
