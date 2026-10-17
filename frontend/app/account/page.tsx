'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Leaf } from 'lucide-react';
import { Brand } from '../../components/brand';
import { Button } from '../../components/ui';
import { useAuth } from '../../components/auth-provider';
import { apiRequest } from '../../lib/api.mjs';
import { safeReturnPath } from '../../lib/session.mjs';

function AccountForm() {
  const params=useSearchParams(),router=useRouter(),{signIn}=useAuth();
  const [register,setRegister]=useState(params.get('mode')==='register');
  const [name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const next=safeReturnPath(params.get('next'));
  async function submit(e:React.FormEvent){
    e.preventDefault();if(busy)return;setBusy(true);setError('');setMessage('');
    try{
      const api=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000';
      if(register){await apiRequest(`${api}/api/v1/auth/register`,{method:'POST',body:{email,password,displayName:name}});setRegister(false);setPassword('');setMessage('Your account is ready. Sign in to open your closet.');}
      else{const data=await apiRequest<{accessToken:string}>(`${api}/api/v1/auth/login`,{method:'POST',body:{email,password}});await signIn(data.accessToken);router.replace(next);}
    }catch(err){setError(err instanceof Error?err.message:'Please try again.');}finally{setBusy(false);}
  }
  return <><header className="auth-header"><Brand /><Link href="/explore" className="back-link"><ArrowLeft size={14} /> Back to exploring</Link></header><main className="auth-layout"><section className="auth-story"><p className="eyebrow"><Leaf size={15} /> OPEN A LITTLE POSSIBILITY.</p><h1>One person’s<br />unused.<br /><em>Your next favourite.</em></h1><p>Join a community that gives good things a second story. Your next exchange starts here.</p><img src="/closet-illustration.svg" alt="" /></section><section className="auth-form"><p className="eyebrow">YOUR NEXT CHAPTER</p><h2>{register?'Create your account':'Welcome back.'}</h2><p className="muted">{register?'A little less clutter. A lot more connection.':'Open your closet. There is something good waiting.'}</p>{message&&<p className="notice" role="status">{message}</p>}<form onSubmit={submit} className="form-stack">{register&&<label className="form-field">Full name<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" required minLength={2} maxLength={80} placeholder="What should we call you?" /></label>}<label className="form-field">Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com" /></label><label className="form-field">Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={register?'new-password':'current-password'} required minLength={register?10:undefined} placeholder={register?'At least 10 characters':'Your password'} />{register&&<small>Use at least 10 characters to keep your account secure.</small>}</label>{error&&<p role="alert" className="alert">{error}</p>}<Button type="submit" busy={busy} className="full">{register?'Create account':'Log in'} <ArrowRight size={16} /></Button></form><p className="auth-toggle">{register?'Already part of the loop?':'New to PERDTU?'}<button type="button" disabled={busy} onClick={()=>{setRegister(!register);setError('');setMessage('');}}>{register?'Log in':'Create an account'}</button></p></section></main></>;
}
export default function Account(){return <Suspense fallback={<div className="state-panel">Opening your closet…</div>}><AccountForm /></Suspense>;}
