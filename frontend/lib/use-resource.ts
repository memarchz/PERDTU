'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../components/auth-provider';

export function useResource<T>(path: string) {
  const { request } = useAuth();
  const [data, setData] = useState<T | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    try {
      const result = await request<T>(path, { signal });
      if (!signal?.aborted) setData(result);
      return result;
    } catch (err) {
      if (!signal?.aborted) setError(err instanceof Error ? err.message : 'Could not load your data.');
      throw err;
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [request, path]);
  useEffect(() => {
    const controller = new AbortController(); setData(null);
    void load(controller.signal).catch(() => {});
    return () => controller.abort();
  }, [load]);
  return { data, loading, error, refresh: () => load() };
}
