import Link from 'next/link';
import { ArrowDownLeft, ArrowRight } from 'lucide-react';
import type { Edge, ItemSummary, PublicUser } from '../lib/types';

type CycleItem = Pick<ItemSummary, 'id' | 'title' | 'imageUrl'>;
export function CycleView({ edges, items, participants, currentUserId }: { edges: Edge[]; items: CycleItem[]; participants: PublicUser[]; currentUserId: string }) {
  const name = (id: string) => participants.find(p => p.id === id)?.displayName || 'Member';
  const item = (id: string) => items.find(i => i.id === id);
  const outgoing = edges.find(e => e.from === currentUserId), incoming = edges.find(e => e.to === currentUserId);
  return <div>
    <div className="cycle-people">{edges.map(edge => <div className={`cycle-person ${edge.from === currentUserId ? 'mine' : ''}`} key={edge.itemId}>
      {item(edge.itemId)?.imageUrl ? <img src={item(edge.itemId)!.imageUrl!} alt="" style={{ width: 34, height: 34, borderRadius: 7, objectFit: 'cover' }} /> : <span className="avatar">{name(edge.from).slice(0, 1).toUpperCase()}</span>}
      <div><h3>{name(edge.from)}{edge.from === currentUserId ? ' · you' : ''}</h3><p>{item(edge.itemId)?.title || 'Exchange item'}</p></div><ArrowRight className="cycle-arrow" size={15} /><span style={{ maxWidth: 90, fontSize: 10, color: '#78916b', overflowWrap: 'anywhere' }}>{name(edge.to)}{edge.to === currentUserId ? ' · you' : ''}</span>
    </div>)}</div>
    <div className="cycle-summary"><p>You give <strong>{outgoing ? item(outgoing.itemId)?.title : '—'}</strong></p><p>You receive <strong>{incoming ? item(incoming.itemId)?.title : '—'}</strong></p></div>
    <div className="give-receive"><h3>How this exchange connects</h3><ol>{edges.map((edge, index) => <li key={edge.itemId}><span>{index + 1}</span><span><strong>{edge.from === currentUserId ? 'You' : name(edge.from)}</strong> give <Link className="text-link" href={`/items/${edge.itemId}`}>{item(edge.itemId)?.title || 'an item'}</Link> to <strong>{edge.to === currentUserId ? 'you' : name(edge.to)}</strong>.</span></li>)}</ol><p className="footnote" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ArrowDownLeft size={13} /> Everyone gives one thing. Everyone receives one thing.</p></div>
  </div>;
}
