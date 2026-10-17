'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, LogOut, Package, Repeat2 } from 'lucide-react';
import { AppShell } from '../../components/app-shell';
import { RequireAuth } from '../../components/require-auth';
import { useAuth } from '../../components/auth-provider';
import { Button, PageHeading } from '../../components/ui';

function ProfileContent() {
  const { user, signOut } = useAuth(), router = useRouter();
  if (!user) return null;
  return <div className="content-narrow"><PageHeading eyebrow="A PART OF THE LOOP" title="Your little corner." description="A place for your things, your exchange preferences, and their next chapters." /><section className="panel"><div className="profile-hero"><span className="avatar">{user.displayName.slice(0, 1).toUpperCase()}</span><div><h2>{user.displayName}</h2><p>{user.email}</p></div></div><div className="notice">You’re here to give good things another story. No money needed.</div><div className="profile-links"><Link href="/my-items"><Package size={18} /> My closet</Link><Link href="/saved-items"><Heart size={18} /> Saved items</Link><Link href="/matches"><Repeat2 size={18} /> Suggested swaps</Link><Link href="/trades"><Repeat2 size={18} /> My trades</Link></div><div className="form-divider" /><Button className="secondary" onClick={() => { signOut(); router.replace('/'); }}><LogOut size={16} /> Log out</Button></section></div>;
}
export default function Profile() { return <AppShell><RequireAuth><ProfileContent /></RequireAuth></AppShell>; }
