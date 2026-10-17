'use client';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AppShell } from '../../components/app-shell';
import { RequireAuth } from '../../components/require-auth';
import { Button, PageHeading, PageState } from '../../components/ui';
import { OwnerActions } from '../../components/owner-actions';
import { ItemCard } from '../../components/item-card';
import { useResource } from '../../lib/use-resource';
import type { ItemSummary } from '../../lib/types';

function Closet() {
  const { data, loading, error, refresh } = useResource<ItemSummary[]>('/me/items');
  return <><PageHeading eyebrow="ROOM FOR SOMETHING NEW" title="Your closet." description="Good things you are giving another chance." action={<Link href="/post" className="button"><Plus size={15} /> Post an item</Link>} />
    {loading ? <PageState title="Opening your closet…" loading /> : error ? <PageState title="Couldn’t load your items." description={error} error action={<Button onClick={() => void refresh().catch(() => {})}>Try again</Button>} /> : !data?.length ? <PageState title="Your next story starts here." description="Post the things you no longer use. They could be exactly what someone needs." action={<Link href="/post" className="button">Post your first item</Link>} /> : <><div className="list-heading"><h2>All your items</h2><span>{data.length} in your closet</span></div><div className="items-grid">{data.map(item => <div key={item.id}>{item.status==='ARCHIVED'?<article className="panel"><h2>{item.title}</h2><p>Archived ? no longer public</p></article>:<ItemCard item={item} showStatus />}{item.status==='AVAILABLE'&&<OwnerActions id={item.id} refresh={refresh}/>}</div>)}</div></>}
  </>;
}
export default function MyItems() { return <AppShell><RequireAuth><Closet /></RequireAuth></AppShell>; }
