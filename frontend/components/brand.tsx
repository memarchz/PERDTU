import Link from 'next/link';

export function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" aria-label="PERDTU home" className={`brand ${light ? 'brand-light' : ''}`}>
    <svg width="42" height="46" viewBox="0 0 48 52" fill="none" aria-hidden="true">
      <path d="M8 20 23 16 40 20V44L24 40 8 44V20Z" fill="currentColor" opacity=".15" />
      <path d="m24 18-17 4v24l17-4m0-24 17 4v24l-17-4m0-24v24" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M11 15C16 5 29 4 37 10m-6-7 7 7-9 2" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 29v4m10-4v4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
    <span className="brand-word">เปิดตู้<span>PERDTU</span></span>
  </Link>;
}
