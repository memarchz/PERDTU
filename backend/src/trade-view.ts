import { Prisma } from '@prisma/client';

export const publicUserSelect = { id: true, displayName: true } as const;
export const tradeInclude = {
  participants: { include: { user: { select: publicUserSelect } } },
  items: true,
  events: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
} satisfies Prisma.TradeInclude;
