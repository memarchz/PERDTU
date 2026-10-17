'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../components/auth-provider';

export function useResource<T>(path: string, options: {refreshOnVisible?:boolean} = {}) {
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
    let controller = new AbortController(); setData(null);
    void load(controller.signal).catch(() => {});
    const visible = () => {
      if (document.hidden) return;
      controller.abort(); controller = new AbortController();
      void load(controller.signal).catch(() => {});
    };
    if(options.refreshOnVisible) document.addEventListener('visibilitychange',visible);
    return () => {controller.abort();if(options.refreshOnVisible)document.removeEventListener('visibilitychange',visible);};
  }, [load, options.refreshOnVisible]);
  return { data, loading, error, refresh: () => load() };
}
