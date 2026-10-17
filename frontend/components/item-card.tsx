'use client';
import Link from 'next/link';
import {ExchangePreference} from './exchange-preference';
import {SaveItemButton} from './save-item-button';
import { Armchair, BookOpen, Dumbbell, Headphones, MapPin, Package, Shirt, ArrowUpRight } from 'lucide-react';
import type { ItemSummary } from '../lib/types';
import { StatusBadge } from './ui';

const categories: Record<string, { icon: typeof Package; color: string }> = {
  Electronics: { icon: Headphones, color: 'sage' }, Books: { icon: BookOpen, color: 'sand' }, Clothing: { icon: Shirt, color: 'rose' },
  'Home & Living': { icon: Armchair, color: 'sage' }, Sports: { icon: Dumbbell, color: 'sand' },
};
export function ItemCard({ item, showStatus = false }: { item: ItemSummary; showStatus?: boolean }) {
  const art = categories[item.category] || { icon: Package, color: 'sage' }, Icon = art.icon;
  return <article className="item-card"><Link href={item.status==='ARCHIVED'?'/my-items':`/items/${item.id}`} className="item-card-link">
    <div className={`item-image ${art.color}`}>{item.imageUrl ? <img src={item.imageUrl} alt={item.title} loading="lazy" /> : <div className="item-placeholder"><Icon size={66} strokeWidth={1} aria-hidden="true" /><span>A new story awaits</span></div>}<span className="item-open"><ArrowUpRight size={17} /></span><span className="condition-chip">{item.condition.replaceAll('_', ' ').toLowerCase()}</span></div>
    <div className="item-card-body"><span className="item-category">{item.category}</span><h2>{item.title}</h2><p className="item-location"><MapPin size={12} aria-hidden="true" />{item.area || 'Campus'}</p><ExchangePreference item={item}/>{showStatus && <StatusBadge status={item.status} />}</div>
  </Link><SaveItemButton itemId={item.id}/></article>;
}
