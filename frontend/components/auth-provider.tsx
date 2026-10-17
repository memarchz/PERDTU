'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiRequest, ApiError, type RequestOptions } from '../lib/api.mjs';
import type { User } from '../lib/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const TOKEN = 'perdtu_token';
type Auth = { user: User | null; loading: boolean; error: string; signIn(token: string): Promise<void>; signOut(): void; refreshSession(): Promise<void>; request<T>(path: string, options?: RequestOptions): Promise<T> };
const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const signOut = useCallback(() => { generation.current++; sessionStorage.removeItem(TOKEN); setUser(null); setError(''); setLoading(false); }, []);
  const loadUser = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true); setError('');
    const token = sessionStorage.getItem(TOKEN);
    const current = () => generation.current === version && sessionStorage.getItem(TOKEN) === token;
    if (!token) { setUser(null); setLoading(false); return; }
    try { const profile = await apiRequest<User>(`${API}/api/v1/users/me`, { token }); if (current()) setUser(profile); }
    catch (err) {
      if (!current()) return;
      setUser(null);
      if (err instanceof ApiError && err.status === 401) sessionStorage.removeItem(TOKEN);
      else setError(err instanceof Error ? err.message : 'Could not load your account.');
      throw err;
    } finally { if (generation.current === version) setLoading(false); }
  }, []);
  useEffect(() => { void loadUser().catch(() => {}); }, [loadUser]);
  const signIn = useCallback(async (token: string) => { sessionStorage.setItem(TOKEN, token); await loadUser(); }, [loadUser]);
  const requestGeneration = generation.current;
  const request = useCallback(async <T,>(path: string, options: RequestOptions = {}): Promise<T> => {
    if (generation.current !== requestGeneration) throw new ApiError('Your session changed. Please return to the current account before continuing.', 401);
    const token = sessionStorage.getItem(TOKEN);
    if (!token) { signOut(); throw new ApiError('Please sign in to continue.', 401); }
    try { return await apiRequest<T>(`${API}/api/v1${path}`, { ...options, token }); }
    catch (err) { if (err instanceof ApiError && err.status === 401 && sessionStorage.getItem(TOKEN) === token) signOut(); throw err; }
  }, [signOut, requestGeneration]);
  return <AuthContext.Provider value={{ user, loading, error, signIn, signOut, refreshSession: loadUser, request }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth requires AuthProvider');
  return context;
}
