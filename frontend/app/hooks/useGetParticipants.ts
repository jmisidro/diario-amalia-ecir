import { useState, useEffect, useCallback } from 'react';
import useApi from '../utils/useApi';
import { Participant, ParticipantsResponse } from '@lib/types';

const useGetParticipants = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const { request } = useApi();

  const getParticipants = useCallback(async () => {
    setLoading(true);
    try {

      const data = await request<ParticipantsResponse>(`/user/getParticipants`);

      if (data?.participants) {
        setParticipants(data.participants);
      }
    } catch (error: any) {
      console.error('[ERROR]: useGetParticipants - ', error);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    getParticipants();
  }, [getParticipants]);

  return { loading, participants, setParticipants, getParticipants };
};

export default useGetParticipants;
