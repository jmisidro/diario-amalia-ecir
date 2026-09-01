import { useState, useEffect, useCallback } from 'react';
import useApi from '../utils/useApi';
import { Subject, SubjectsResponse } from '@lib/types';

const useGetSubjects = (topic: string = 'all', date?: string) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const { request } = useApi();

  const getSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (topic) params.append('topic', topic);
      if (date) params.append('date', date);

      const data = await request<SubjectsResponse>(`/user/getSubjects?${params.toString()}`);

      if (data?.subjects) {
        setSubjects(data.subjects);
      }
    } catch (error: any) {
      console.error('[ERROR]: useGetSubjects - ', error);
    } finally {
      setLoading(false);
    }
  }, [request, topic, date]);

  useEffect(() => {
    getSubjects();
  }, [getSubjects]);

  return { loading, subjects, setSubjects, getSubjects };
};

export default useGetSubjects;
