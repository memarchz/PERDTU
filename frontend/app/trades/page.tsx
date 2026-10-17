'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, RefreshCw, Repeat2 } from 'lucide-react';
import { AppShell } from '../../components/app-shell';
import { RequireAuth } from '../../components/require-auth';
import { useAuth } from '../../components/auth-provider';
import { Button, PageHeading, PageState, StatusBadge } from '../../components/ui';
import { useResource } from '../../lib/use-resource';
import type { Trade } from '../../lib/types';

function TradesContent() {
  const { user } = useAuth(), { data, loading, error, refresh } = useResource<Trade[]>('/trades');
  const [filter, setFilter] = useState('');
  const filtered = data?.filter(t => !filter || t.status === filter) || [];
  return <><PageHeading eyebrow="STORIES IN THE MAKING" title="Your exchanges." description="From a good connection to a new beginning." action={<Button className="secondary small" busy={loading} onClick={() => void refresh().catch(() => {})}><RefreshCw size={14} /> Refresh</Button>} />
    <div className="list-heading"><h2>Your swap stories</h2><label><span className="sr-only">Filter trade status</span><select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}><option value="">All exchanges</option>{['PROPOSED', 'CONFIRMED', 'EXCHANGING', 'COMPLETED', 'DECLINED'].map(state => <option value={state} key={state}>{state.toLowerCase()}</option>)}</select></label></div>
    {loading ? <PageState title="Finding your exchanges…" loading /> : error ? <PageState title="Couldn’t load your trades." description={error} error action={<Button onClick={() => void refresh().catch(() => {})}>Try again</Button>} /> : !filtered.length ? <PageState title="Your next story is still unwritten." description={filter ? 'No exchanges have this status yet. Try viewing all exchanges.' : 'Find a suggested swap and invite everyone to make it happen.'} action={<Link href="/matches" className="button">Find suggested swaps <ArrowRight size={15} /></Link>} /> : <div className="trade-list">{filtered.map(trade => {
      const giving = trade.items.find(i => i.fromUserId === user!.id), receiving = trade.items.find(i => i.toUserId === user!.id);
      return <Link href={`/trades/${trade.id}`} key={trade.id} className="trade-card"><span className="trade-card-icon"><Repeat2 size={23} /></span><div><StatusBadge status={trade.status} /><h2>{giving?.snapshot.title || 'Your item'} → {receiving?.snapshot.title || 'Your next story'}</h2><p>{trade.participants.length}-person exchange · {new Date(trade.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' })}</p></div><ArrowRight size={18} /></Link>;
    })}</div>}
  </>;
}
export default function Trades() { return <AppShell><RequireAuth><TradesContent /></RequireAuth></AppShell>; }
