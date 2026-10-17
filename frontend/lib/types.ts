export type PublicUser = { id: string; displayName: string };
export type User = PublicUser & { email: string; role: string };
export type ItemSummary = { id: string; ownerId: string; title: string; description: string; category: string; condition: string; area: string; status: string; exchangeWanted?:string|null;exchangeCategory?:string|null;exchangeOpenToAlternatives?:boolean;imageUrl?: string | null; images?: {id:string;url:string;width:number;height:number;position:number}[]; owner?: PublicUser };
export type Wish = { id: string; description: string; category: string | null };
export type Edge = { from: string; to: string; itemId: string; score?: number };
export type Match = {fingerprints?:Record<string,string>;kind:'strong'|'alternative';viewerFit:number;fits:{receiverItemId:string;offerItemId:string;fit:{score:number;kind:string;reason:string}}[]; edges: Edge[]; score: number; items: ItemSummary[]; participants: PublicUser[] };
export type TradeParticipant = { id: string; userId: string; decision: string; received: boolean; user: PublicUser };
export type TradeItem = { id: string; itemId: string; fromUserId: string; toUserId: string; snapshot: Omit<ItemSummary, 'id'> };
export type TradeEvent = { id: string; actorId: string; eventType: string; createdAt: string };
export type Trade = { id: string; status: string; createdAt: string; participants: TradeParticipant[]; items: TradeItem[]; events: TradeEvent[] };
export const CATEGORIES = ['Electronics', 'Books', 'Clothing', 'Home & Living', 'Sports', 'Other'];
export const CONDITIONS = [{ value: 'LIKE_NEW', label: 'Like new' }, { value: 'GOOD', label: 'Good' }, { value: 'FAIR', label: 'Fair' }, { value: 'FOR_PARTS', label: 'For parts' }];

export type SavedEntry={id:string;itemId:string;createdAt:string;available:boolean;item:ItemSummary|{id:string;title:string;status:string}};

export type MatchEnvelope={status:string;selectedItemId:string|null;model?:{id:string;revision:string};matches:Match[];candidatesConsidered:number;truncated:boolean;message?:string};
export type ChatMessage = {id:string;sender:{id:string;displayName:string};body:string;createdAt:string;clientMessageId:string};
