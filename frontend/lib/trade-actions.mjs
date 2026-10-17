export function cycleKey(edges) { return edges.map(e => `${e.from}>${e.to}:${e.itemId}`).sort().join('|'); }

export function availableTradeActions(trade, currentUserId) {
  const me = trade.participants.find(p => p.userId === currentUserId);
  const pending = !!me && trade.status === 'PROPOSED' && me.decision === 'PENDING';
  return {
    canAccept: pending, canDecline: pending,
    canConfirmReceipt: !!me && me.decision === 'ACCEPTED' && !me.received && ['CONFIRMED', 'EXCHANGING'].includes(trade.status),
  };
}
