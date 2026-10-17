import { Check } from 'lucide-react';
import type { PublicUser, TradeEvent } from '../lib/types';

const eventLabels: Record<string, string> = { ITEM_UPDATED: 'updated an item, cancelling this pending proposal', ITEM_ARCHIVED: 'archived an item, cancelling this pending proposal', PROPOSED: 'proposed this exchange', ACCEPTED: 'accepted the exchange', DECLINED: 'declined the exchange', RECEIPT_CONFIRMED: 'confirmed receiving their item' };
export function TradeTimeline({ events, participants }: { events: TradeEvent[]; participants: PublicUser[] }) {
  return <><ol className="timeline">{events.map(event => <li key={event.id}><span className="timeline-dot"><Check size={12} /></span><div><p><strong>{participants.find(p => p.id === event.actorId)?.displayName || 'A participant'}</strong> {eventLabels[event.eventType] || event.eventType.replaceAll('_', ' ').toLowerCase()}</p><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' })}</time></div></li>)}</ol><p className="footnote">Times shown in Bangkok time.</p></>;
}
