import { ArrowRight, CircleAlert, LoaderCircle, PackageOpen } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Button({ busy, children, className = '', disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return <button {...props} disabled={disabled || busy} className={`button ${className}`} aria-busy={busy || undefined}>
    {busy && <LoaderCircle size={17} className="spin" aria-hidden="true" />}{children}
  </button>;
}
export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="muted">{description}</p>}</div>{action}</div>;
}
export function StatusBadge({ status }: { status: string }) {
  const positive = ['AVAILABLE', 'CONFIRMED', 'COMPLETED', 'ACCEPTED'].includes(status);
  const negative = ['DECLINED', 'CANCELLED', 'DISPUTED'].includes(status);
  return <span className={`status-badge ${positive ? 'positive' : negative ? 'negative' : ''}`}>{status.replaceAll('_', ' ').toLowerCase()}</span>;
}
export function PageState({ title, description, error, loading, action }: { title: string; description?: string; error?: boolean; loading?: boolean; action?: ReactNode }) {
  const Icon = loading ? LoaderCircle : error ? CircleAlert : PackageOpen;
  return <div className={`state-panel ${error ? 'error-state' : ''}`} role={error ? 'alert' : loading ? 'status' : undefined}>
    <span className="state-icon"><Icon size={28} className={loading ? 'spin' : ''} aria-hidden="true" /></span>
    <h2>{title}</h2>{description && <p className="muted">{description}</p>}{action}
  </div>;
}
export function TextArrow() { return <ArrowRight size={17} aria-hidden="true" />; }
