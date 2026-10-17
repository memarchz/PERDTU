export function availableTradeActions(trade: { status: string; participants: { userId: string; decision: string; received: boolean }[] }, currentUserId: string): { canAccept: boolean; canDecline: boolean; canConfirmReceipt: boolean };
export function cycleKey(edges: { from: string; to: string; itemId: string }[]): string;
