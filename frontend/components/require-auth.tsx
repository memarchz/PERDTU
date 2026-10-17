'use client';
import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from './auth-provider';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, error, refreshSession, signOut } = useAuth();
  const router = useRouter(), path = usePathname(), params = useSearchParams();
  const destination = `${path}${params.size ? `?${params.toString()}` : ''}`;
  useEffect(() => {
    if (!loading && !user && !error) router.replace(`/account?next=${encodeURIComponent(destination)}`);
  }, [loading, user, error, router, destination]);
  if (loading) return <div className="state-panel" role="status">Opening your closet…</div>;
  if (error) return <div className="state-panel"><p role="alert">{error}</p><div className="button-row"><button className="button" onClick={() => void refreshSession().catch(() => {})}>Try again</button><button className="button secondary" onClick={signOut}>Sign in again</button></div></div>;
  if (!user) return <div className="state-panel" role="status">Taking you to sign in…</div>;
  return children;
}
