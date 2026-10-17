'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Check, PackageCheck, RefreshCw, X } from 'lucide-react';
import { AppShell } from '../../../components/app-shell';
import { RequireAuth } from '../../../components/require-auth';
import { useAuth } from '../../../components/auth-provider';
import { Button, PageHeading, PageState, StatusBadge } from '../../../components/ui';
import { CycleView } from '../../../components/cycle-view';
import { TradeTimeline } from '../../../components/trade-timeline';
import { useResource } from '../../../lib/use-resource';
import { availableTradeActions } from '../../../lib/trade-actions.mjs';
import type { Trade } from '../../../lib/types';

function TradeContent() {
  const { id } = useParams<{ id: string }>(), { user, request } = useAuth();
  const { data: trade, loading, error, refresh } = useResource<Trade>(`/trades/${id}`);
  const [busy, setBusy] = useState(''), [message, setMessage] = useState(''), [actionError, setActionError] = useState('');
  async function act(action: 'accept' | 'decline' | 'receipt') {
    if (busy) return; setBusy(action); setMessage(''); setActionError(''); let saved = false;
    try {
      await request(`/trades/${id}/${action === 'receipt' ? 'receipt' : 'respond'}`, { method: 'POST', body: action === 'receipt' ? {} : { accept: action === 'accept' } }); saved = true;
      await refresh(); setMessage(action === 'receipt' ? 'Your receipt is confirmed. Thank you for keeping things in the loop.' : action === 'accept' ? 'You accepted this exchange. It is confirmed when everyone accepts.' : 'You declined this exchange. Your items remain available.');
    } catch (err) {
      setActionError(saved ? 'Your response was saved, but the latest status could not be loaded. Please refresh.' : `${err instanceof Error ? err.message : 'Could not save your response.'} Refresh before trying again.`);
      if (!saved) await refresh().catch(() => {});
    } finally { setBusy(''); }
  }
  const actions = trade ? availableTradeActions(trade, user!.id) : null;
  const progress = ['PROPOSED', 'CONFIRMED', 'EXCHANGING', 'COMPLETED'], step = trade ? progress.indexOf(trade.status) : -1;
  return <><Link href="/trades" className="back-link" style={{ marginBottom: 24 }}><ArrowLeft size={14} /> Back to my exchanges</Link><PageHeading eyebrow="GOOD THINGS, COMING AROUND" title="A story worth sharing." description={trade ? `${trade.participants.length} people connected by a thoughtful exchange.` : 'Your exchange details.'} action={<Button className="secondary small" busy={loading} disabled={!!busy} onClick={() => void refresh().catch(() => {})}><RefreshCw size={14} /> Refresh</Button>} />
    {message && <p className="notice" role="status">{message}</p>}{actionError && <p className="alert" role="alert">{actionError}</p>}
    {loading ? <PageState title="Loading the latest chapter…" loading /> : error || !trade ? <PageState title={error === 'Not found.' ? 'This exchange isn’t available.' : 'Couldn’t open this exchange.'} description={error === 'Not found.' ? 'Only participants can view an exchange. Check that you are signed in with the right account.' : error} error action={<Button onClick={() => void refresh().catch(() => {})}>Try again</Button>} /> : <>
      {step >= 0 && <div className="trade-progress" aria-label={`Exchange status: ${trade.status.toLowerCase()}`}>{['Proposed', 'Confirmed', 'Exchanging', 'Completed'].map((label, index) => <div className={`progress-step ${index <= step ? 'done' : ''}`} key={label}><span>{index <= step ? <Check size={14} /> : index + 1}</span>{label}</div>)}</div>}
      <div className="two-columns"><section className="panel"><div className="list-heading"><h2>Everyone gives. Everyone gets.</h2><StatusBadge status={trade.status} /></div><CycleView edges={trade.items.map(i => ({ from: i.fromUserId, to: i.toUserId, itemId: i.itemId }))} items={trade.items.map(i => ({ id: i.itemId, title: i.snapshot.title, imageUrl: i.snapshot.imageUrl }))} participants={trade.participants.map(p => p.user)} currentUserId={user!.id} /><div className="form-divider" /><h2>The people in this story</h2><div className="participant-list">{trade.participants.map(p => <div className="participant" key={p.id}><span className="avatar">{p.user.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{p.user.displayName}{p.userId === user!.id ? ' · you' : ''}</strong><small>{p.received ? 'Receipt confirmed' : p.decision === 'ACCEPTED' ? 'Accepted · awaiting receipt' : p.decision === 'DECLINED' ? 'Declined' : 'Awaiting response'}</small></div><StatusBadge status={p.received ? 'COMPLETED' : p.decision} /></div>)}</div>
      <div className="trade-actions">{trade.status === 'PROPOSED' && <p>Everyone must accept before any item is reserved.</p>}{['CONFIRMED', 'EXCHANGING'].includes(trade.status) && <p>Coordinate your exchange with the other participants. Confirm only after you have received your incoming item.</p>}{trade.status === 'COMPLETED' && <p>All participants have confirmed receipt. A second story for every item.</p>}{trade.status === 'CANCELLED' && <p className="notice">This pending proposal was cancelled because an item was updated or archived. Explore current items for a new exchange.</p>}{trade.status === 'DECLINED' && <p>This proposal was declined. You can look for another connection.</p>}
      <div className="button-row">{actions?.canAccept && <Button busy={busy === 'accept'} disabled={!!busy} onClick={() => void act('accept')}><Check size={16} /> Accept exchange</Button>}{actions?.canDecline && <Button className="danger" busy={busy === 'decline'} disabled={!!busy} onClick={() => void act('decline')}><X size={16} /> Decline</Button>}{actions?.canConfirmReceipt && <Button busy={busy === 'receipt'} disabled={!!busy} onClick={() => void act('receipt')}><PackageCheck size={17} /> Confirm receipt</Button>}{!actions?.canAccept && !actions?.canConfirmReceipt && trade.status === 'PROPOSED' && <p className="notice">Your response is saved. Waiting for the other participants.</p>}</div></div></section><aside className="panel timeline-panel"><h2>Along the way</h2><p className="muted" style={{ marginBottom: 25 }}>The moments that make this exchange.</p><TradeTimeline events={trade.events} participants={trade.participants.map(p => p.user)} /></aside></div>
    </>}
  </>;
}
export default function TradeDetail() { return <AppShell><RequireAuth><TradeContent /></RequireAuth></AppShell>; }
