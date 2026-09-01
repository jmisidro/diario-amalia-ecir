import { toast } from '@/hooks/use-toast';
import { useCallback } from 'react';

export interface ApiError extends Error {
  status?: number;
  message: string;
  [key: string]: any;
}

interface RequestOptions extends RequestInit {
  body?: any;
  headers?: Record<string, string>;
}

const useApi = () => {
  const request = useCallback(async <T = any>(
    path: string,
    options: RequestOptions = {}
  ): Promise<T> => {

    const fullUrl = path.startsWith('/api')
      ? path
      : `/api${path.startsWith('/') ? path : `/${path}`}`;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    let body = options.body;
    if (body && typeof body === 'object') {
      body = JSON.stringify(body);
    }

    // 3-minute timeout — gives the RAG pipeline enough time to run
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180_000);

    try {
      const res = await fetch(fullUrl, {
        ...options,
        headers,
        body,
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        let errorData: any = {};
        const contentType = res.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          errorData = await res.json().catch(() => ({}));
        }

        const errorToThrow: ApiError = {
          name: 'ApiError',
          status: res.status,
          message: errorData.message || res.statusText,
          ...errorData,
        };

        toast({
          variant: "destructive",
          title: "Erro na Request",
          description: errorToThrow.message,
        });

        throw errorToThrow;
      }

      const contentType = res.headers.get('content-type');

      if (res.status === 204) return null as T;

      if (contentType && contentType.includes('application/json')) {
        return await res.json();
      }

      return (await res.text()) as unknown as T;

    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error?.name === 'AbortError') {
        console.error('[ERROR]: useApi - request timed out after 3 minutes');
        const timeoutError: ApiError = {
          name: 'AbortError',
          message: 'O pedido excedeu o tempo limite. Por favor, tente novamente.',
        };
        throw timeoutError;
      }
      console.error('[ERROR]: useApi - request failed:', error);
      throw error;
    }
  }, []);

  return { request };
};

export default useApi;
