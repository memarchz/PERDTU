import { TradeStatus } from '@prisma/client';
import { z } from 'zod';

export const messageInput = z.object({body:z.string().trim().min(1).max(2000),clientMessageId:z.string().uuid()});
export const pageInput = z.object({before:z.string().max(300).optional(),after:z.string().max(300).optional()})
  .refine(q=>!(q.before!==undefined&&q.after!==undefined),'Use one cursor direction');
const cursorInput=z.object({createdAt:z.string().datetime(),id:z.string().uuid()}).strict();
export function encodeCursor(point:{createdAt:Date,id:string}):string {
  return Buffer.from(JSON.stringify({createdAt:point.createdAt.toISOString(),id:point.id})).toString('base64url');
}
export function decodeCursor(cursor:string):{createdAt:Date,id:string} {
  if(!/^[A-Za-z0-9_-]{1,300}$/.test(cursor))throw new ChatError('Invalid message cursor',400);
  try {const value=cursorInput.parse(JSON.parse(Buffer.from(cursor,'base64url').toString('utf8')));return {...value,createdAt:new Date(value.createdAt)};}
  catch {throw new ChatError('Invalid message cursor',400);}
}
export function chatAccess(status:TradeStatus) {
  return {opened:status!=='PROPOSED',canSend:status==='CONFIRMED'||status==='EXCHANGING'};
}
export class ChatError extends Error {constructor(message:string,public status:number){super(message);}}
