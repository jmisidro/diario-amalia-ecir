import { useState, useEffect, useCallback } from 'react';
import useApi from '../utils/useApi';
import { SourcesResponse } from '@lib/types';

const useGetSources = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [sources, setSources] = useState<string[]>([]);
  const { request } = useApi();

  const getSources = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request<SourcesResponse>(`/system/getSources`);

      setSources(data?.sources || []);
    } catch (error: any) {
      console.error('[ERROR]: useGetSources - ', error.message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    getSources();
  }, [getSources]);

  return { loading, sources, setSources, getSources };
};

export default useGetSources;
