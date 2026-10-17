import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
export type AuthReq = Request & { userId?: string };
export const asyncRoute=(fn:(req:AuthReq,res:Response)=>Promise<any>):RequestHandler => (req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
export function createAuth(secret:string):RequestHandler {
  return (req:AuthReq,res:Response,next:NextFunction)=>{
    try { const raw=req.headers.authorization?.replace(/^Bearer /,''); if(!raw)return res.status(401).json({error:'Authentication required'});
      const token=jwt.verify(raw,secret); if(typeof token==='string'||typeof token.sub!=='string')throw Error();req.userId=token.sub;next();
    } catch {res.status(401).json({error:'Invalid token'});}
  };
}
