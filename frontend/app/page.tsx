import Link from 'next/link';
import { ArrowRight, Leaf, Repeat2, Sparkles, ShieldCheck, HeartHandshake } from 'lucide-react';
import { Brand } from '../components/brand';

const steps = [
  ['01', 'Open your closet', 'Post something you no longer need. Someone else might love it.'],
  ['02', 'Set your exchange preferences', 'Tell us what you want in return for each item. Make room for something useful.'],
  ['03', 'Find your people', 'Discover direct and multi-person swaps that connect your wishes.'],
  ['04', 'Swap. Smile. Repeat.', 'Agree together, exchange your things, and confirm they arrived.'],
];
export default function Home() {
  return <div className="landing">
    <header className="public-header"><Brand /><nav className="public-nav" aria-label="Public navigation"><Link href="/">Home</Link><a href="#how-it-works">How it works</a><Link href="/explore">Explore</Link></nav><div className="header-actions"><Link href="/account">Log in</Link><Link href="/account?mode=register" className="button">Get started <ArrowRight size={14} /></Link></div></header>
    <main>
      <section className="hero"><div className="hero-copy"><span className="hero-tag"><Leaf size={13} /> LESS WASTE. MORE POSSIBILITIES.</span><h1>Good things<br />don’t have to end<br /><em>in your closet.</em></h1><p className="hero-description">What you no longer need could be exactly what someone is looking for. Open your closet. Find your next story.</p><div className="button-row"><Link href="/account?mode=register" className="button">Start your first swap <ArrowRight size={17} /></Link><Link href="/explore" className="button secondary">Explore items</Link></div><p className="hero-footnote"><ShieldCheck size={13} /> No money. Just a good exchange.</p></div><div className="hero-visual"><img src="/closet-illustration.svg" alt="An open green closet with clothes, books, a camera and plants" /><div className="hero-sticker">Same things.<br />New stories.</div><div className="hero-float"><span className="hero-float-icon"><Repeat2 size={21} /></span><span><strong>From unused<br />to unforgettable.</strong><small>Good things come around.</small></span></div></div></section>
      <div className="value-strip"><span><Repeat2 size={17} /> Exchange, don’t spend</span><span><HeartHandshake size={18} /> A community that shares</span><span><Leaf size={17} /> Keep good things in the loop</span></div>
      <section id="how-it-works" className="how-section"><div className="section-heading"><div><p className="eyebrow">A LITTLE CHANGE. A NEW CHAPTER.</p><h2>Better together. Better exchanged.</h2></div><p>Four small steps to something good.</p></div><div className="steps-grid">{steps.map(([n,title,description])=><article className="step-card" key={n}><span className="step-number">{n}</span><h3>{title}</h3><p>{description}</p></article>)}</div><div className="notice" style={{marginTop:28,display:'flex',gap:11,alignItems:'center'}}><Sparkles size={18} /><span>Not a perfect two-way match? A multi-person swap can connect the dots.</span></div></section>
    </main><footer className="landing-footer"><span>© PERDTU · Open. Swap. Repeat.</span><span>Same things. New stories.</span></footer>
  </div>;
}
