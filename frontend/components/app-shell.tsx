'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Compass, Heart, LayoutGrid, Leaf, LogIn, Menu, Package, Plus, Repeat2, UserRound, X } from 'lucide-react';
import { Brand } from './brand';
import { useAuth } from './auth-provider';

const links = [
  { href: '/explore', label: 'Explore', icon: Compass }, { href: '/post', label: 'Post an item', icon: Plus },
  { href: '/saved-items', label: 'Saved items', icon: Heart },
  { href: '/my-items', label: 'My closet', icon: Package },
  { href: '/matches', label: 'Suggested swaps', icon: Repeat2 }, { href: '/trades', label: 'My trades', icon: LayoutGrid },
  { href: '/profile', label: 'Profile', icon: UserRound },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(), { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  return <div className="app-shell">
    <div className="mobile-bar"><Brand /><button className="icon-button" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="app-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div>
    {open && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'is-open' : ''}`} id="app-navigation">
      <div className="desktop-brand"><Brand /></div><p className="nav-label">YOUR NEXT CHAPTER</p>
      <nav aria-label="Main navigation">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${path === href || (href === '/trades' && path.startsWith('/trades/')) ? 'active' : ''}`} aria-current={path === href ? 'page' : undefined} onClick={() => setOpen(false)}><Icon size={19} strokeWidth={1.7} />{label}{href === '/post' && <span className="nav-plus">+</span>}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="loop-note"><Leaf size={22} /><p>Good things deserve<br /><strong>another story.</strong></p></div><Link className="nav-account" href={user ? '/profile' : '/account'}><span className="avatar">{user ? user.displayName.slice(0, 1).toUpperCase() : <LogIn size={17} />}</span><span><strong>{loading ? 'Welcome to PERDTU' : user?.displayName || 'Make yourself at home'}</strong><small>{user ? 'View your profile' : 'Sign in to start swapping'}</small></span><ArrowUpRight size={16} /></Link></div>
    </aside>
    <div className="app-main"><header className="app-topbar"><span className="topbar-note"><span className="live-dot" /> A little less waste. A lot more possibility.</span><Link href="/post" className="topbar-action">Post an item <Plus size={16} /></Link></header><main className="app-content"><Suspense fallback={<div className="state-panel" role="status">Opening your closet…</div>}>{children}</Suspense></main><footer className="app-footer"><span>© PERDTU · Open. Swap. Repeat.</span><span>Made for a world that shares.</span></footer></div>
  </div>;
}
