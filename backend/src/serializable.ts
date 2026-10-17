import { Prisma, PrismaClient } from '@prisma/client';

export async function runSerializable<T>(db: PrismaClient, operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt >= 2) throw error;
    }
  }
}

const businessConflicts = new Set([
  'Trade is not awaiting responses', 'Not authorized or already responded',
  'Item already reserved; trade cannot be confirmed', 'Trade is not active', 'Not authorized or already confirmed',
]);
export function conflictMessage(error: unknown): string {
  return error instanceof Error && businessConflicts.has(error.message)
    ? error.message : 'This trade changed while you were responding. Refresh and try again.';
}
